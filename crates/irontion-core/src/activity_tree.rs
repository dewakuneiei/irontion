//! Add a whole tree of activities at once (a template, an import) without overlapping
//! what already exists.
//!
//! Nodes are matched to existing activities by name, ignoring case, among siblings (top level
//! to top level, children to the children of the matched parent). A node that matches is never
//! duplicated: it is kept as it is, or overwritten with the new color when the caller asks.
//! Everything is added in one transaction: if any node is invalid, nothing is added.

use rusqlite::Connection;

use crate::model::{ActivityId, NewActivity, TreeNode, TreePlanItem, TreeReport};
use crate::{Result, activities, validate};

/// Where a node's siblings live.
#[derive(Clone, Copy)]
enum Scope {
    /// Under this parent (`None` = the top level), where existing activities may match.
    Under(Option<ActivityId>),
    /// Under a parent that does not exist yet, so nothing can match.
    New,
}

/// Every node in display order, with whether it already exists. Changes nothing.
pub fn plan(conn: &Connection, nodes: &[TreeNode]) -> Result<Vec<TreePlanItem>> {
    let mut items = Vec::new();
    plan_level(conn, Scope::Under(None), nodes, &mut Vec::new(), &mut items)?;
    Ok(items)
}

fn plan_level(
    conn: &Connection,
    scope: Scope,
    nodes: &[TreeNode],
    path: &mut Vec<String>,
    items: &mut Vec<TreePlanItem>,
) -> Result<()> {
    for node in nodes {
        let name = validate::name(&node.name)?;
        path.push(node.name.clone());
        let existing = match scope {
            Scope::Under(parent) => find_sibling(conn, parent, &name)?,
            Scope::New => None,
        };
        items.push(TreePlanItem {
            path: path.clone(),
            exists: existing.is_some(),
        });
        let below = existing.map_or(Scope::New, |id| Scope::Under(Some(id)));
        plan_level(conn, below, &node.children, path, items)?;
        path.pop();
    }
    Ok(())
}

/// Add the tree. Nodes whose path is in `overwrite` that already exist get the new color;
/// other existing nodes are left alone and only their new children are added.
pub fn apply(conn: &mut Connection, nodes: &[TreeNode], overwrite: &[Vec<String>]) -> Result<TreeReport> {
    let tx = conn.transaction()?;
    let mut report = TreeReport::default();
    apply_level(&tx, None, nodes, &mut Vec::new(), overwrite, &mut report)?;
    tx.commit()?;
    Ok(report)
}

fn apply_level(
    conn: &Connection,
    parent: Option<ActivityId>,
    nodes: &[TreeNode],
    path: &mut Vec<String>,
    overwrite: &[Vec<String>],
    report: &mut TreeReport,
) -> Result<()> {
    for node in nodes {
        let name = validate::name(&node.name)?;
        path.push(node.name.clone());
        let id = match find_sibling(conn, parent, &name)? {
            Some(id) if overwrite.contains(path) => {
                activities::set_color(conn, id, node.color.as_deref())?;
                report.recolored += 1;
                id
            }
            Some(id) => {
                report.kept += 1;
                id
            }
            None => {
                let created = activities::create_in(
                    conn,
                    NewActivity {
                        parent_id: parent,
                        name,
                        color: node.color.clone(),
                        tag_ids: Vec::new(),
                    },
                )?;
                report.created += 1;
                created.id
            }
        };
        apply_level(conn, Some(id), &node.children, path, overwrite, report)?;
        path.pop();
    }
    Ok(())
}

/// The first active activity under `parent` with this name, ignoring case. Archived ones
/// are out of the way, so they don't count.
fn find_sibling(conn: &Connection, parent: Option<ActivityId>, name: &str) -> Result<Option<ActivityId>> {
    let wanted = name.to_lowercase();
    let mut stmt = conn.prepare(
        "SELECT id, name FROM activities
         WHERE parent_id IS ?1 AND archived_at IS NULL
         ORDER BY position, id",
    )?;
    let rows = stmt.query_map([parent], |r| Ok((r.get::<_, ActivityId>(0)?, r.get::<_, String>(1)?)))?;
    for row in rows {
        let (id, existing) = row?;
        if existing.trim().to_lowercase() == wanted {
            return Ok(Some(id));
        }
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Error;
    use crate::db::open_in_memory;
    use crate::model::Activity;

    fn node(name: &str, color: Option<&str>, children: Vec<TreeNode>) -> TreeNode {
        TreeNode {
            name: name.into(),
            color: color.map(Into::into),
            children,
        }
    }

    fn top(conn: &mut Connection, name: &str, color: &str) -> Activity {
        activities::create(
            conn,
            NewActivity {
                parent_id: None,
                name: name.into(),
                color: Some(color.into()),
                tag_ids: vec![],
            },
        )
        .unwrap()
    }

    fn names(conn: &Connection) -> Vec<String> {
        activities::list(conn).unwrap().into_iter().map(|a| a.name).collect()
    }

    fn study_tree() -> Vec<TreeNode> {
        vec![node(
            "Study",
            Some("#2a78d6"),
            vec![node("Math", None, vec![]), node("Notes", Some("#eb6834"), vec![])],
        )]
    }

    #[test]
    fn adds_a_whole_tree_with_colors_and_positions() {
        let mut conn = open_in_memory().unwrap();
        let report = apply(&mut conn, &study_tree(), &[]).unwrap();
        assert_eq!(
            report,
            TreeReport {
                created: 3,
                recolored: 0,
                kept: 0
            }
        );

        let all = activities::list(&conn).unwrap();
        let study = all.iter().find(|a| a.name == "Study").unwrap();
        let math = all.iter().find(|a| a.name == "Math").unwrap();
        let notes = all.iter().find(|a| a.name == "Notes").unwrap();
        assert_eq!(study.parent_id, None);
        assert_eq!(math.parent_id, Some(study.id));
        assert_eq!(math.color, None); // inherits
        assert_eq!(notes.color.as_deref(), Some("#eb6834"));
        assert!(math.position < notes.position);
    }

    #[test]
    fn activity_a_plus_template_b_gives_both() {
        let mut conn = open_in_memory().unwrap();
        top(&mut conn, "A", "#123456");
        apply(&mut conn, &[node("B", Some("#abcdef"), vec![])], &[]).unwrap();
        assert_eq!(names(&conn), vec!["A", "B"]);
    }

    #[test]
    fn a_same_name_is_reported_not_duplicated() {
        let mut conn = open_in_memory().unwrap();
        top(&mut conn, "Study", "#123456");

        let items = plan(&conn, &study_tree()).unwrap();
        let flags: Vec<(String, bool)> = items.iter().map(|i| (i.path.join(" / "), i.exists)).collect();
        assert_eq!(
            flags,
            vec![
                ("Study".into(), true),
                ("Study / Math".into(), false),
                ("Study / Notes".into(), false)
            ]
        );

        // Without an overwrite the existing activity is untouched, but its new children are added.
        let report = apply(&mut conn, &study_tree(), &[]).unwrap();
        assert_eq!(
            report,
            TreeReport {
                created: 2,
                recolored: 0,
                kept: 1
            }
        );
        let all = activities::list(&conn).unwrap();
        assert_eq!(all.iter().filter(|a| a.name == "Study").count(), 1);
        assert_eq!(
            all.iter().find(|a| a.name == "Study").unwrap().color.as_deref(),
            Some("#123456")
        );
    }

    #[test]
    fn overwrite_recolors_only_the_chosen_ones() {
        let mut conn = open_in_memory().unwrap();
        top(&mut conn, "Study", "#123456");
        apply(&mut conn, &study_tree(), &[]).unwrap();
        // Now Math and Notes exist too; overwrite Study and Notes, keep Math.
        let report = apply(
            &mut conn,
            &study_tree(),
            &[vec!["Study".into()], vec!["Study".into(), "Notes".into()]],
        )
        .unwrap();
        assert_eq!(
            report,
            TreeReport {
                created: 0,
                recolored: 2,
                kept: 1
            }
        );
        let all = activities::list(&conn).unwrap();
        assert_eq!(
            all.iter().find(|a| a.name == "Study").unwrap().color.as_deref(),
            Some("#2a78d6")
        );
    }

    #[test]
    fn matching_ignores_case_and_spaces_and_skips_archived() {
        let mut conn = open_in_memory().unwrap();
        let old = top(&mut conn, "  study ", "#123456");
        let items = plan(&conn, &[node("STUDY", Some("#2a78d6"), vec![])]).unwrap();
        assert!(items[0].exists);

        activities::archive(&conn, old.id).unwrap();
        let items = plan(&conn, &[node("Study", Some("#2a78d6"), vec![])]).unwrap();
        assert!(!items[0].exists, "an archived activity is out of the way");
    }

    #[test]
    fn children_merge_into_a_matched_parent() {
        let mut conn = open_in_memory().unwrap();
        let study = top(&mut conn, "Study", "#123456");
        activities::create(
            &mut conn,
            NewActivity {
                parent_id: Some(study.id),
                name: "Math".into(),
                color: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let report = apply(&mut conn, &study_tree(), &[]).unwrap();
        // Study and Math already exist; only Notes is new.
        assert_eq!(
            report,
            TreeReport {
                created: 1,
                recolored: 0,
                kept: 2
            }
        );
    }

    #[test]
    fn the_same_name_under_a_different_parent_is_not_a_match() {
        let mut conn = open_in_memory().unwrap();
        let rest = top(&mut conn, "Rest", "#123456");
        activities::create(
            &mut conn,
            NewActivity {
                parent_id: Some(rest.id),
                name: "Math".into(),
                color: None,
                tag_ids: vec![],
            },
        )
        .unwrap();
        let items = plan(&conn, &study_tree()).unwrap();
        assert!(items.iter().all(|i| !i.exists));
    }

    #[test]
    fn one_bad_node_adds_nothing() {
        let mut conn = open_in_memory().unwrap();
        let tree = vec![
            node("Good", Some("#2a78d6"), vec![]),
            node("Bad color", Some("blue"), vec![]),
        ];
        assert!(matches!(apply(&mut conn, &tree, &[]), Err(Error::InvalidColor)));
        assert!(names(&conn).is_empty());

        let no_color = vec![node("Good", Some("#2a78d6"), vec![]), node("No color", None, vec![])];
        assert!(matches!(apply(&mut conn, &no_color, &[]), Err(Error::ColorRequired)));
        assert!(names(&conn).is_empty());
    }

    #[test]
    fn nesting_beyond_the_limit_fails_and_rolls_back() {
        let mut conn = open_in_memory().unwrap();
        let mut deepest = node("L6", None, vec![]);
        for level in (1..=5).rev() {
            deepest = node(&format!("L{level}"), (level == 1).then_some("#2a78d6"), vec![deepest]);
        }
        assert!(matches!(apply(&mut conn, &[deepest], &[]), Err(Error::TooDeep)));
        assert!(names(&conn).is_empty());
    }

    #[test]
    fn overwriting_a_top_level_activity_needs_a_color() {
        let mut conn = open_in_memory().unwrap();
        top(&mut conn, "Study", "#123456");
        let tree = vec![node("Study", None, vec![])];
        let err = apply(&mut conn, &tree, &[vec!["Study".into()]]);
        assert!(matches!(err, Err(Error::ColorRequired)));
    }
}
