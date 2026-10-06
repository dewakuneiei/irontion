// Building blocks for the template data: the localized-text helper, the palette, and the
// words that many templates share, so each is written (and translated) once.

import type { Localized, TemplateNode } from "$lib/domain/templates";

/** English, Thai, Simplified Chinese, Japanese, Korean. */
export const l = (en: string, th: string, zhCN: string, ja: string, ko: string): Localized => ({
  en,
  th,
  "zh-CN": zhCN,
  ja,
  ko,
});

/** One activity, optionally with sub-activities. Without a color it inherits its parent's. */
export const node = (name: Localized, color?: string, children?: TemplateNode[]): TemplateNode => ({
  name,
  color,
  children,
});

// Colors from the activity palette (src/lib/domain/color.ts), readable in light and dark.
export const BLUE = "#2a78d6";
export const ORANGE = "#eb6834";
export const GREEN = "#1baf7a";
export const YELLOW = "#eda100";
export const PINK = "#e87ba4";
export const DARK_GREEN = "#008300";
export const VIOLET = "#6a5ae0";
export const RED = "#e34948";
export const TEAL = "#4a90a4";
export const GRAY = "#898781";

export const word = {
  // Daily life
  sleep: l("Sleep", "นอนหลับ", "睡眠", "睡眠", "수면"),
  meals: l("Meals", "มื้ออาหาร", "用餐", "食事", "식사"),
  exercise: l("Exercise", "ออกกำลังกาย", "运动", "運動", "운동"),
  health: l("Health", "สุขภาพ", "健康", "健康", "건강"),
  rest: l("Rest", "พักผ่อน", "休息", "休憩", "휴식"),
  breaks: l("Breaks", "พักเบรก", "休息时间", "休憩時間", "쉬는 시간"),
  recovery: l("Recovery", "ฟื้นตัว", "恢复", "回復", "회복"),
  family: l("Family", "ครอบครัว", "家人", "家族", "가족"),
  friends: l("Friends", "เพื่อน", "朋友", "友達", "친구"),
  hobbies: l("Hobbies", "งานอดิเรก", "兴趣爱好", "趣味", "취미"),
  gaming: l("Gaming", "เล่นเกม", "游戏", "ゲーム", "게임"),
  cooking: l("Cooking", "ทำอาหาร", "做饭", "料理", "요리"),
  cleaning: l("Cleaning", "ทำความสะอาด", "清洁", "掃除", "청소"),
  shopping: l("Shopping", "ซื้อของ", "购物", "買い物", "장보기"),
  chores: l("Chores", "งานบ้าน", "家务", "家事", "집안일"),
  commute: l("Commute", "เดินทาง", "通勤", "通勤", "출퇴근"),
  travel: l("Travel", "เดินทางท่องเที่ยว", "旅行", "旅行", "여행"),
  money: l("Money", "การเงิน", "财务", "お金", "재정"),
  mindfulness: l("Mindfulness", "สติและสมาธิ", "正念", "マインドフルネス", "마음챙김"),
  journaling: l("Journaling", "เขียนบันทึก", "写日记", "ジャーナリング", "일기 쓰기"),
  planTomorrow: l("Plan tomorrow", "วางแผนวันพรุ่งนี้", "规划明天", "明日の計画", "내일 계획"),
  windDown: l("Wind down", "ผ่อนคลายก่อนนอน", "睡前放松", "就寝前のくつろぎ", "잠들기 전 정리"),
  personalTime: l("Personal time", "เวลาส่วนตัว", "个人时间", "自分の時間", "개인 시간"),
  appointments: l("Appointments", "การนัดหมาย", "预约", "予約", "예약"),

  // Work
  work: l("Work", "การทำงาน", "工作", "仕事", "업무"),
  deepWork: l("Deep work", "งานที่ต้องโฟกัส", "深度工作", "集中作業", "딥 워크"),
  planning: l("Planning", "วางแผน", "规划", "計画", "계획"),
  meetings: l("Meetings", "ประชุม", "会议", "会議", "회의"),
  email: l("Email", "อีเมล", "邮件", "メール", "이메일"),
  admin: l("Admin", "งานธุรการ", "行政事务", "事務作業", "행정 업무"),
  paperwork: l("Paperwork", "งานเอกสาร", "文书工作", "書類作業", "서류 작업"),
  buffer: l("Buffer time", "เวลาสำรอง", "缓冲时间", "バッファ", "여유 시간"),
  shutdown: l("Shutdown routine", "สรุปงานก่อนเลิก", "收工仪式", "終業ルーティン", "퇴근 루틴"),
  reporting: l("Reporting", "รายงานผล", "汇报", "報告", "보고"),
  strategy: l("Strategy", "กลยุทธ์", "战略", "戦略", "전략"),
  followUps: l("Follow-ups", "ติดตามงาน", "跟进", "フォローアップ", "후속 조치"),
  stakeholders: l("Stakeholders", "ผู้เกี่ยวข้อง", "相关方", "ステークホルダー", "이해관계자"),
  clientMeetings: l("Client meetings", "ประชุมกับลูกค้า", "客户会议", "クライアントとの会議", "고객 미팅"),
  clientSessions: l("Client sessions", "การพบผู้รับบริการ", "咨询会谈", "セッション", "상담 세션"),
  tickets: l("Tickets and tracking", "ทิกเก็ตและติดตามงาน", "工单与跟踪", "チケット管理", "티켓 관리"),
  documentation: l("Documentation", "เอกสาร", "文档", "ドキュメント", "문서화"),
  marketing: l("Marketing", "การตลาด", "营销", "マーケティング", "마케팅"),
  socialMedia: l("Social media", "โซเชียลมีเดีย", "社交媒体", "SNS", "소셜 미디어"),
  community: l("Community", "ชุมชน", "社群", "コミュニティ", "커뮤니티"),
  collaborate: l("Collaborate", "ทำงานร่วมกัน", "协作", "コラボレーション", "협업"),
  build: l("Build", "สร้างงาน", "开发", "開発", "개발"),
  projects: l("Projects", "โปรเจกต์", "项目", "プロジェクト", "프로젝트"),
  sideProjects: l("Side projects", "โปรเจกต์ส่วนตัว", "个人项目", "個人プロジェクト", "사이드 프로젝트"),
  userInterviews: l("User interviews", "สัมภาษณ์ผู้ใช้", "用户访谈", "ユーザーインタビュー", "사용자 인터뷰"),

  // Learning and thinking
  learning: l("Learning", "เรียนรู้", "学习", "学び", "배움"),
  reading: l("Reading", "อ่านหนังสือ", "阅读", "読書", "독서"),
  review: l("Review", "ทบทวน", "复盘", "振り返り", "리뷰"),
  classes: l("Classes", "คาบเรียน", "上课", "授業", "수업"),
  homework: l("Homework", "การบ้าน", "作业", "宿題", "숙제"),
  revision: l("Revision", "ทบทวนบทเรียน", "复习", "復習", "복습"),
  research: l("Research", "การค้นคว้า", "调研", "調査", "조사"),
  analysis: l("Analysis", "การวิเคราะห์", "分析", "分析", "분석"),
  writing: l("Writing", "การเขียน", "写作", "執筆", "글쓰기"),
  drafting: l("Drafting", "เขียนร่าง", "起草", "下書き", "초안 쓰기"),
  editing: l("Editing", "แก้ไขต้นฉบับ", "修改", "推敲", "퇴고"),
  notes: l("Taking notes", "จดบันทึก", "做笔记", "ノート作り", "노트 정리"),
  practice: l("Practice", "ฝึกฝน", "练习", "練習", "연습"),
  feedback: l("Feedback", "ข้อเสนอแนะ", "反馈", "フィードバック", "피드백"),
  training: l("Training", "ฝึกอบรม", "培训", "研修", "교육"),
  prepLessons: l("Preparing lessons", "เตรียมการสอน", "备课", "授業準備", "수업 준비"),
  marking: l("Marking and feedback", "ตรวจงานและให้ข้อเสนอแนะ", "批改与反馈", "採点とフィードバック", "채점과 피드백"),
};
