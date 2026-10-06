// The built-in activity templates, grouped by category in the order the gallery shows them.
// Each category has its own file; every name is written in all five languages, because the
// activities a template creates belong to the user and are shown as typed.

import type { ActivityTemplate } from "$lib/domain/templates";
import { BUSINESS_TEMPLATES } from "./business";
import { CARE_TEMPLATES } from "./care";
import { CREATIVE_TEMPLATES } from "./creative";
import { HOME_TEMPLATES } from "./home";
import { PERSONAL_TEMPLATES } from "./personal";
import { SERVICE_TEMPLATES } from "./service";
import { STUDENT_TEMPLATES } from "./student";
import { TECH_TEMPLATES } from "./tech";
import { TECHNIQUE_TEMPLATES } from "./technique";

export const TEMPLATES: ActivityTemplate[] = [
  ...TECHNIQUE_TEMPLATES,
  ...PERSONAL_TEMPLATES,
  ...HOME_TEMPLATES,
  ...STUDENT_TEMPLATES,
  ...TECH_TEMPLATES,
  ...BUSINESS_TEMPLATES,
  ...CREATIVE_TEMPLATES,
  ...CARE_TEMPLATES,
  ...SERVICE_TEMPLATES,
];
