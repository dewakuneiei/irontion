// The built-in activity templates. Order is the order they appear in each category.
// Every name is written in all five languages, because the activities they create belong to
// the user and are shown as typed.

import type { ActivityTemplate, Localized, TemplateNode } from "$lib/domain/templates";

/** English, Thai, Simplified Chinese, Japanese, Korean. */
const l = (en: string, th: string, zhCN: string, ja: string, ko: string): Localized => ({
  en,
  th,
  "zh-CN": zhCN,
  ja,
  ko,
});

// Colors from the activity palette (src/lib/domain/color.ts), readable in light and dark.
const BLUE = "#2a78d6";
const ORANGE = "#eb6834";
const GREEN = "#1baf7a";
const YELLOW = "#eda100";
const PINK = "#e87ba4";
const DARK_GREEN = "#008300";
const VIOLET = "#6a5ae0";
const RED = "#e34948";
const TEAL = "#4a90a4";
const GRAY = "#898781";

/** Words several templates share, so each is written once. */
const word = {
  sleep: l("Sleep", "นอนหลับ", "睡眠", "睡眠", "수면"),
  meals: l("Meals", "มื้ออาหาร", "用餐", "食事", "식사"),
  exercise: l("Exercise", "ออกกำลังกาย", "运动", "運動", "운동"),
  health: l("Health", "สุขภาพ", "健康", "健康", "건강"),
  rest: l("Rest", "พักผ่อน", "休息", "休憩", "휴식"),
  breaks: l("Breaks", "พักเบรก", "休息时间", "休憩時間", "쉬는 시간"),
  email: l("Email", "อีเมล", "邮件", "メール", "이메일"),
  planning: l("Planning", "วางแผน", "规划", "計画", "계획"),
  meetings: l("Meetings", "ประชุม", "会议", "会議", "회의"),
  learning: l("Learning", "เรียนรู้", "学习", "学び", "배움"),
  reading: l("Reading", "อ่านหนังสือ", "阅读", "読書", "독서"),
  review: l("Review", "ทบทวน", "复盘", "振り返り", "리뷰"),
  friends: l("Friends", "เพื่อน", "朋友", "友達", "친구"),
  family: l("Family", "ครอบครัว", "家人", "家族", "가족"),
  hobbies: l("Hobbies", "งานอดิเรก", "兴趣爱好", "趣味", "취미"),
  classes: l("Classes", "คาบเรียน", "上课", "授業", "수업"),
  deepWork: l("Deep work", "งานที่ต้องโฟกัส", "深度工作", "集中作業", "딥 워크"),
  admin: l("Admin", "งานธุรการ", "行政事务", "事務作業", "행정 업무"),
};

const node = (name: Localized, color?: string, children?: TemplateNode[]): TemplateNode => ({
  name,
  color,
  children,
});

export const TEMPLATES: ActivityTemplate[] = [
  // ---------- Time management techniques ----------
  {
    id: "eisenhower",
    category: "technique",
    name: l(
      "Eisenhower matrix (4Q)",
      "เมทริกซ์ไอเซนฮาวร์ (4Q)",
      "艾森豪威尔矩阵（四象限）",
      "アイゼンハワー・マトリクス（4象限）",
      "아이젠하워 매트릭스 (4사분면)",
    ),
    description: l(
      "Sort your time by urgent and important: do first, schedule, delegate, don't do.",
      "จัดเวลาตามความเร่งด่วนและความสำคัญ: ทำก่อน วางตาราง มอบหมาย ไม่ทำ",
      "按紧急和重要程度分配时间：马上做、计划做、委派、不做。",
      "緊急度と重要度で時間を分けます。最優先、予定する、任せる、やらない。",
      "긴급함과 중요도로 시간을 나눠요. 먼저 하기, 일정 잡기, 맡기기, 하지 않기.",
    ),
    nodes: [
      node(l("Do first", "ทำก่อน", "马上做", "最優先", "먼저 하기"), RED, [
        node(l("Urgent work", "งานด่วน", "紧急工作", "急ぎの仕事", "급한 일")),
        node(l("Deadlines", "กำหนดส่ง", "截止事项", "締め切り", "마감")),
      ]),
      node(l("Schedule", "วางตาราง", "计划做", "予定する", "일정 잡기"), GREEN, [
        node(word.planning),
        node(word.deepWork),
        node(word.exercise),
        node(word.learning),
      ]),
      node(l("Delegate", "มอบหมาย", "委派", "任せる", "맡기기"), ORANGE, [
        node(l("Routine tasks", "งานประจำ", "例行事务", "ルーティン作業", "반복 업무")),
        node(l("Hand over to others", "มอบให้ผู้อื่น", "交给他人", "人に任せる", "다른 사람에게 맡기기")),
      ]),
      node(l("Don't do", "ไม่ทำ", "不做", "やらない", "하지 않기"), BLUE, [
        node(l("Social media", "โซเชียลมีเดีย", "社交媒体", "SNS", "소셜 미디어")),
        node(l("Random videos", "ดูคลิปเรื่อยเปื่อย", "随便刷视频", "ダラダラ動画", "무심코 보는 영상")),
      ]),
    ],
  },
  {
    id: "pomodoro",
    category: "technique",
    name: l("Pomodoro technique", "เทคนิคโพโมโดโร", "番茄工作法", "ポモドーロ・テクニック", "포모도로 기법"),
    description: l(
      "Work in focused rounds with short breaks. One 25-minute round is about three blocks.",
      "ทำงานเป็นรอบโฟกัสสลับพักสั้น ๆ หนึ่งรอบ 25 นาทีประมาณสามบล็อก",
      "专注工作一轮后短暂休息。一个 25 分钟的番茄钟约占三个时间块。",
      "集中して働き、短く休みます。25 分の 1 ラウンドは約 3 ブロックです。",
      "집중해서 일하고 짧게 쉬어요. 25분 한 번은 약 3블록이에요.",
    ),
    nodes: [
      node(l("Focus round", "รอบโฟกัส", "专注时段", "集中ラウンド", "집중 라운드"), RED),
      node(l("Short break", "พักสั้น", "短休息", "短い休憩", "짧은 휴식"), GREEN),
      node(l("Long break", "พักยาว", "长休息", "長い休憩", "긴 휴식"), BLUE),
      node(word.review, VIOLET),
    ],
  },
  {
    id: "deep-work",
    category: "technique",
    name: l(
      "Deep work and shallow work",
      "งานเชิงลึกและงานผิวเผิน",
      "深度工作与浅层工作",
      "ディープワークとシャローワーク",
      "딥 워크와 섈로 워크",
    ),
    description: l(
      "Protect long stretches for demanding work, and batch the small stuff.",
      "ปกป้องช่วงเวลายาวสำหรับงานที่ต้องใช้สมาธิ และรวมงานจิปาถะไว้ด้วยกัน",
      "为高难度工作保留整块时间，把琐事集中处理。",
      "負荷の高い仕事のために長い時間を確保し、細かい作業はまとめます。",
      "집중이 필요한 일에 긴 시간을 확보하고 잡무는 모아서 처리해요.",
    ),
    nodes: [
      node(word.deepWork, VIOLET, [
        node(l("Main project", "โปรเจกต์หลัก", "主要项目", "メインプロジェクト", "핵심 프로젝트")),
        node(l("Thinking and design", "คิดและออกแบบ", "思考与设计", "思考と設計", "생각과 설계")),
      ]),
      node(l("Shallow work", "งานผิวเผิน", "浅层工作", "シャローワーク", "섈로 워크"), ORANGE, [
        node(word.email),
        node(l("Messages", "ข้อความแชท", "消息", "メッセージ", "메시지")),
        node(word.admin),
      ]),
      node(l("Buffer time", "เวลาสำรอง", "缓冲时间", "バッファ", "여유 시간"), GRAY),
      node(word.breaks, GREEN),
      node(l("Shutdown routine", "สรุปงานก่อนเลิก", "收工仪式", "終業ルーティン", "퇴근 루틴"), TEAL),
    ],
  },
  {
    id: "gtd",
    category: "technique",
    name: l(
      "Getting Things Done (GTD)",
      "Getting Things Done (GTD)",
      "GTD 工作法",
      "GTD（Getting Things Done）",
      "GTD (Getting Things Done)",
    ),
    description: l(
      "Capture everything, decide what it means, then do the next action.",
      "จดทุกอย่าง ตัดสินใจว่าคืออะไร แล้วลงมือทำขั้นต่อไป",
      "把所有事情记下来，想清楚含义，然后做下一步行动。",
      "すべて書き出し、意味を決め、次の行動を実行します。",
      "모든 것을 적고, 의미를 정하고, 다음 행동을 실행해요.",
    ),
    nodes: [
      node(l("Capture", "จดบันทึก", "收集", "収集", "수집"), YELLOW),
      node(l("Clarify and organize", "จัดระเบียบ", "理清与整理", "明確化と整理", "정리하기"), BLUE),
      node(l("Do", "ลงมือทำ", "执行", "実行", "실행"), RED, [
        node(l("Next actions", "งานถัดไป", "下一步行动", "次の行動", "다음 행동")),
        node(l("Projects", "โปรเจกต์", "项目", "プロジェクト", "프로젝트")),
        node(l("Waiting for", "รอผู้อื่น", "等待他人", "待ち", "기다리는 중")),
      ]),
      node(word.review, GREEN, [
        node(l("Daily check", "เช็กประจำวัน", "每日检查", "毎日チェック", "일일 점검")),
        node(l("Weekly review", "ทบทวนประจำสัปดาห์", "每周回顾", "週次レビュー", "주간 리뷰")),
      ]),
    ],
  },

  // ---------- Personal ----------
  {
    id: "wheel-of-life",
    category: "personal",
    name: l("Wheel of life", "วงล้อชีวิต", "生命之轮", "ライフバランスホイール", "삶의 바퀴"),
    description: l(
      "See how your time is spread across the areas of a balanced life.",
      "ดูว่าเวลาของคุณกระจายไปในแต่ละด้านของชีวิตที่สมดุลอย่างไร",
      "查看时间在人生各个领域的分布是否均衡。",
      "バランスの取れた生活の各分野に、時間がどう配分されているかを見ます。",
      "균형 잡힌 삶의 여러 영역에 시간이 어떻게 쓰이는지 살펴봐요.",
    ),
    nodes: [
      node(word.health, GREEN, [node(word.sleep), node(word.exercise)]),
      node(l("Career", "การงาน", "事业", "仕事", "커리어"), BLUE, [
        node(l("Work", "การทำงาน", "工作", "仕事", "업무")),
        node(word.learning),
      ]),
      node(l("Money", "การเงิน", "财务", "お金", "재정"), YELLOW),
      node(l("Family and friends", "ครอบครัวและเพื่อน", "家人和朋友", "家族と友人", "가족과 친구"), ORANGE, [
        node(word.family),
        node(word.friends),
      ]),
      node(l("Personal growth", "พัฒนาตนเอง", "个人成长", "自己成長", "자기계발"), VIOLET),
      node(l("Fun and hobbies", "ความสนุกและงานอดิเรก", "娱乐与爱好", "楽しみと趣味", "즐거움과 취미"), PINK),
      node(l("Home and surroundings", "บ้านและสภาพแวดล้อม", "居家与环境", "住まいと環境", "집과 환경"), TEAL),
      node(l("Mind and spirit", "จิตใจ", "心灵", "心と精神", "마음과 정신"), DARK_GREEN),
    ],
  },
  {
    id: "healthy-routine",
    category: "personal",
    name: l(
      "Healthy daily routine",
      "กิจวัตรประจำวันที่ดี",
      "健康的日常作息",
      "健康的な毎日のルーティン",
      "건강한 하루 루틴",
    ),
    description: l(
      "Sleep, movement, meals and calm: the basics of a steady day.",
      "การนอน การเคลื่อนไหว มื้ออาหาร และความสงบ พื้นฐานของวันที่มั่นคง",
      "睡眠、活动、饮食和放松：稳定一天的基础。",
      "睡眠、運動、食事、そして落ち着く時間。安定した一日の土台です。",
      "수면, 움직임, 식사, 마음의 안정. 꾸준한 하루의 기본이에요.",
    ),
    nodes: [
      node(l("Morning routine", "กิจวัตรตอนเช้า", "晨间习惯", "朝の習慣", "아침 루틴"), YELLOW, [
        node(l("Wake up and stretch", "ตื่นและยืดเส้น", "起床拉伸", "起きてストレッチ", "기상과 스트레칭")),
        node(l("Breakfast", "อาหารเช้า", "早餐", "朝食", "아침 식사")),
      ]),
      node(word.exercise, RED, [
        node(l("Cardio", "คาร์ดิโอ", "有氧运动", "有酸素運動", "유산소")),
        node(l("Strength", "เวทเทรนนิง", "力量训练", "筋力トレーニング", "근력 운동")),
      ]),
      node(word.meals, GREEN, [
        node(l("Cooking", "ทำอาหาร", "做饭", "料理", "요리")),
        node(l("Lunch", "อาหารกลางวัน", "午餐", "昼食", "점심")),
        node(l("Dinner", "อาหารเย็น", "晚餐", "夕食", "저녁")),
      ]),
      node(l("Calm and mindfulness", "ผ่อนคลายและสติ", "放松与正念", "リラックスと瞑想", "휴식과 명상"), VIOLET, [
        node(l("Meditation", "ทำสมาธิ", "冥想", "瞑想", "명상")),
        node(l("Wind down", "ผ่อนคลายก่อนนอน", "睡前放松", "就寝前のくつろぎ", "잠들기 전 정리")),
      ]),
      node(word.sleep, TEAL),
    ],
  },

  // ---------- Student ----------
  {
    id: "student",
    category: "student",
    name: l(
      "Student day",
      "วันของนักเรียนนักศึกษา",
      "学生的一天",
      "学生の一日",
      "학생의 하루",
    ),
    description: l(
      "Classes, homework, revision, health and rest in one balanced week.",
      "คาบเรียน การบ้าน การทบทวน สุขภาพ และการพักผ่อน ในสัปดาห์ที่สมดุล",
      "上课、作业、复习、健康和休息，平衡的一周。",
      "授業、宿題、復習、健康、休息をバランスよく。",
      "수업, 숙제, 복습, 건강, 휴식을 균형 있게.",
    ),
    nodes: [
      node(l("Study", "เรียน", "学习", "勉強", "공부"), BLUE, [
        node(word.classes),
        node(l("Homework", "การบ้าน", "作业", "宿題", "숙제")),
        node(l("Revision", "ทบทวนบทเรียน", "复习", "復習", "복습")),
        node(word.reading),
        node(l("Group project", "งานกลุ่ม", "小组项目", "グループ課題", "팀 프로젝트")),
      ]),
      node(word.health, GREEN, [node(word.sleep), node(word.exercise), node(word.meals)]),
      node(word.rest, YELLOW, [
        node(word.friends),
        node(word.hobbies),
        node(l("Gaming", "เล่นเกม", "游戏", "ゲーム", "게임")),
      ]),
    ],
  },

  // ---------- Career ----------
  {
    id: "developer",
    category: "career",
    name: l(
      "Software developer",
      "นักพัฒนาซอฟต์แวร์",
      "软件开发者",
      "ソフトウェア開発者",
      "소프트웨어 개발자",
    ),
    description: l(
      "Coding in long stretches, with room for reviews, meetings and learning.",
      "เขียนโค้ดต่อเนื่องยาว ๆ พร้อมเวลาสำหรับรีวิว ประชุม และเรียนรู้",
      "长时间编码，同时留出评审、会议和学习的时间。",
      "長いコーディング時間に加え、レビュー、会議、学習の時間も確保します。",
      "길게 코딩하는 시간과 리뷰, 회의, 배움의 시간을 함께 챙겨요.",
    ),
    nodes: [
      node(l("Build", "สร้างงาน", "开发", "開発", "개발"), BLUE, [
        node(l("Coding", "เขียนโค้ด", "编码", "コーディング", "코딩")),
        node(l("Design and planning", "ออกแบบและวางแผน", "设计与规划", "設計と計画", "설계와 계획")),
        node(l("Debugging", "แก้บั๊ก", "调试", "デバッグ", "디버깅")),
      ]),
      node(l("Collaborate", "ทำงานร่วมกัน", "协作", "コラボレーション", "협업"), ORANGE, [
        node(l("Code review", "รีวิวโค้ด", "代码评审", "コードレビュー", "코드 리뷰")),
        node(word.meetings),
        node(l("Helping teammates", "ช่วยเพื่อนร่วมทีม", "帮助同事", "チームの支援", "동료 돕기")),
      ]),
      node(l("Learn", "เรียนรู้", "学习", "学ぶ", "배우기"), VIOLET, [
        node(l("Docs and articles", "เอกสารและบทความ", "文档与文章", "ドキュメントと記事", "문서와 글")),
        node(l("Side projects", "โปรเจกต์ส่วนตัว", "个人项目", "個人プロジェクト", "사이드 프로젝트")),
      ]),
      node(word.admin, GRAY, [
        node(word.email),
        node(l("Tickets and tracking", "ทิกเก็ตและติดตามงาน", "工单与跟踪", "チケット管理", "티켓 관리")),
      ]),
      node(word.breaks, GREEN),
    ],
  },
  {
    id: "freelance-creative",
    category: "career",
    name: l(
      "Freelance creative",
      "ฟรีแลนซ์สายครีเอทีฟ",
      "自由创作者",
      "フリーランスのクリエイター",
      "프리랜서 크리에이터",
    ),
    description: l(
      "Client work, personal projects and the business side, all in one week.",
      "งานลูกค้า โปรเจกต์ส่วนตัว และงานบริหารธุรกิจ ในสัปดาห์เดียว",
      "客户工作、个人作品和经营事务，一周搞定。",
      "クライアントワーク、自主制作、事業運営を一週間にまとめます。",
      "클라이언트 작업, 개인 프로젝트, 사업 운영을 한 주에 담아요.",
    ),
    nodes: [
      node(l("Creative work", "งานสร้างสรรค์", "创作", "クリエイティブ作業", "창작 작업"), PINK, [
        node(l("Client projects", "งานลูกค้า", "客户项目", "クライアント案件", "클라이언트 프로젝트")),
        node(l("Personal projects", "โปรเจกต์ส่วนตัว", "个人作品", "自主制作", "개인 프로젝트")),
        node(l("Practice", "ฝึกฝน", "练习", "練習", "연습")),
      ]),
      node(l("Business", "ธุรกิจ", "经营", "ビジネス", "비즈니스"), BLUE, [
        node(l("Replying to clients", "ตอบลูกค้า", "回复客户", "クライアント対応", "클라이언트 응대")),
        node(l("Invoices and payments", "ใบแจ้งหนี้และการชำระเงิน", "发票与收款", "請求と入金", "청구와 결제")),
        node(l("Marketing", "การตลาด", "营销", "マーケティング", "마케팅")),
      ]),
      node(l("Life", "ชีวิตประจำวัน", "生活", "生活", "생활"), GREEN, [node(word.exercise), node(word.meals)]),
    ],
  },
  {
    id: "manager",
    category: "career",
    name: l(
      "Manager or team lead",
      "ผู้จัดการ / หัวหน้าทีม",
      "经理 / 团队负责人",
      "マネージャー／チームリーダー",
      "매니저 / 팀 리더",
    ),
    description: l(
      "Time for your people, your plans and your own growth, not just meetings.",
      "เวลาให้ทีมของคุณ แผนงาน และการเติบโตของตัวเอง ไม่ใช่แค่ประชุม",
      "留给团队、计划和自身成长的时间，而不只是开会。",
      "会議だけでなく、メンバー、計画、自分の成長にも時間を使います。",
      "회의만이 아니라 팀원, 계획, 나 자신의 성장에 시간을 써요.",
    ),
    nodes: [
      node(l("People", "ทีมงาน", "团队成员", "メンバー", "팀원"), ORANGE, [
        node(l("One-on-ones", "คุยตัวต่อตัว", "一对一沟通", "1on1", "1:1 면담")),
        node(l("Team meetings", "ประชุมทีม", "团队会议", "チーム会議", "팀 회의")),
        node(l("Hiring", "สรรหาบุคลากร", "招聘", "採用", "채용")),
      ]),
      node(l("Strategy", "กลยุทธ์", "战略", "戦略", "전략"), BLUE, [
        node(word.planning),
        node(l("Reviews and reports", "รีวิวและรายงาน", "复盘与汇报", "レビューと報告", "리뷰와 보고")),
      ]),
      node(l("Execution", "การลงมือ", "执行", "実行", "실행"), RED, [
        node(l("Follow-ups", "ติดตามงาน", "跟进", "フォローアップ", "후속 조치")),
        node(word.email),
      ]),
      node(l("Growth", "การเติบโต", "成长", "成長", "성장"), VIOLET, [
        node(word.reading),
        node(l("Networking", "สร้างเครือข่าย", "人脉拓展", "ネットワーキング", "네트워킹")),
      ]),
    ],
  },
  {
    id: "teacher",
    category: "career",
    name: l("Teacher", "ครู", "教师", "教師", "교사"),
    description: l(
      "Teaching, preparing, giving feedback and looking after your own time.",
      "การสอน การเตรียมการ การให้ข้อเสนอแนะ และการดูแลเวลาของตัวเอง",
      "授课、备课、反馈，也照顾好自己的时间。",
      "授業、準備、フィードバック、そして自分の時間も大切に。",
      "수업, 준비, 피드백, 그리고 나만의 시간까지 챙겨요.",
    ),
    nodes: [
      node(l("Teaching", "การสอน", "教学", "授業", "수업"), BLUE, [
        node(word.classes),
        node(l("Preparing lessons", "เตรียมการสอน", "备课", "授業準備", "수업 준비")),
      ]),
      node(l("Marking and feedback", "ตรวจงานและให้ข้อเสนอแนะ", "批改与反馈", "採点とフィードバック", "채점과 피드백"), ORANGE),
      node(l("Supporting students", "ดูแลนักเรียน", "辅导学生", "生徒の支援", "학생 지원"), PINK, [
        node(l("Office hours", "ชั่วโมงให้คำปรึกษา", "答疑时间", "オフィスアワー", "상담 시간")),
        node(l("Parents and guardians", "ผู้ปกครอง", "家长沟通", "保護者対応", "학부모 상담")),
      ]),
      node(l("School admin", "งานธุรการโรงเรียน", "学校事务", "学校事務", "학교 행정"), GRAY, [
        node(word.meetings),
        node(l("Paperwork", "งานเอกสาร", "文书工作", "書類作業", "서류 작업")),
      ]),
      node(l("Professional growth", "การพัฒนาวิชาชีพ", "专业成长", "専門性の向上", "전문성 개발"), VIOLET),
      node(word.rest, GREEN),
    ],
  },
  {
    id: "writer",
    category: "career",
    name: l("Writer or researcher", "นักเขียน / นักวิจัย", "作家 / 研究者", "ライター／研究者", "작가 / 연구자"),
    description: l(
      "Long stretches for writing, with research, editing and sharing around them.",
      "ช่วงเวลายาวสำหรับการเขียน พร้อมการค้นคว้า แก้ไข และเผยแพร่",
      "整块时间用于写作，并安排调研、修改和发布。",
      "執筆の長い時間に、調査、推敲、発信を組み合わせます。",
      "글쓰기에 긴 시간을 쓰고 조사, 퇴고, 공유를 함께 해요.",
    ),
    nodes: [
      node(l("Writing", "การเขียน", "写作", "執筆", "글쓰기"), VIOLET, [
        node(l("Drafting", "เขียนร่าง", "起草", "下書き", "초안 쓰기")),
        node(l("Editing", "แก้ไขต้นฉบับ", "修改", "推敲", "퇴고")),
      ]),
      node(l("Research", "การค้นคว้า", "调研", "調査", "조사"), BLUE, [
        node(word.reading),
        node(l("Taking notes", "จดบันทึก", "做笔记", "ノート作り", "노트 정리")),
      ]),
      node(l("Ideas and outlines", "ไอเดียและโครงเรื่อง", "灵感与大纲", "アイデアと構成", "아이디어와 구성"), YELLOW),
      node(l("Publishing and sharing", "เผยแพร่และแบ่งปัน", "发布与分享", "発表と発信", "발행과 공유"), ORANGE),
      node(word.breaks, GREEN),
    ],
  },
];
