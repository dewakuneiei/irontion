import type { ActivityTemplate } from "$lib/domain/templates";
import { BLUE, DARK_GREEN, GRAY, GREEN, ORANGE, PINK, RED, TEAL, VIOLET, YELLOW, l, node, word } from "./words";

export const PERSONAL_TEMPLATES: ActivityTemplate[] = [
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
      node(l("Career", "การงาน", "事业", "仕事", "커리어"), BLUE, [node(word.work), node(word.learning)]),
      node(word.money, YELLOW),
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
        node(word.cooking),
        node(l("Lunch", "อาหารกลางวัน", "午餐", "昼食", "점심")),
        node(l("Dinner", "อาหารเย็น", "晚餐", "夕食", "저녁")),
      ]),
      node(l("Calm and mindfulness", "ผ่อนคลายและสติ", "放松与正念", "リラックスと瞑想", "휴식과 명상"), VIOLET, [
        node(l("Meditation", "ทำสมาธิ", "冥想", "瞑想", "명상")),
        node(word.windDown),
      ]),
      node(word.sleep, TEAL),
    ],
  },
  {
    id: "fitness",
    category: "personal",
    name: l("Fitness training", "การฝึกออกกำลังกาย", "健身训练", "フィットネストレーニング", "피트니스 훈련"),
    description: l(
      "Strength, cardio, mobility and recovery, with time to prepare and eat well.",
      "เวทเทรนนิง คาร์ดิโอ ความยืดหยุ่น และการฟื้นตัว พร้อมเวลาเตรียมและกินให้ดี",
      "力量、有氧、柔韧和恢复，也留出准备与饮食的时间。",
      "筋トレ、有酸素、可動域、回復に、準備と食事の時間も。",
      "근력, 유산소, 유연성, 회복. 준비와 식사 시간도 챙겨요.",
    ),
    nodes: [
      node(l("Warm-up", "วอร์มอัป", "热身", "ウォームアップ", "워밍업"), YELLOW),
      node(l("Strength training", "เวทเทรนนิง", "力量训练", "筋力トレーニング", "근력 운동"), RED, [
        node(l("Upper body", "ร่างกายส่วนบน", "上肢", "上半身", "상체")),
        node(l("Lower body", "ร่างกายส่วนล่าง", "下肢", "下半身", "하체")),
        node(l("Core", "แกนกลางลำตัว", "核心", "体幹", "코어")),
      ]),
      node(l("Cardio", "คาร์ดิโอ", "有氧运动", "有酸素運動", "유산소"), ORANGE),
      node(l("Stretching and mobility", "ยืดเหยียดและความยืดหยุ่น", "拉伸与柔韧", "ストレッチと可動域", "스트레칭과 유연성"), VIOLET),
      node(word.recovery, GREEN),
      node(l("Meal prep", "เตรียมอาหาร", "备餐", "作り置き", "식단 준비"), TEAL),
    ],
  },
  {
    id: "self-care",
    category: "personal",
    name: l(
      "Self-care and wellbeing",
      "ดูแลตัวเองและสุขภาวะ",
      "自我关怀与身心健康",
      "セルフケアとウェルビーイング",
      "셀프 케어와 웰빙",
    ),
    description: l(
      "Small daily habits that keep body and mind steady.",
      "นิสัยเล็ก ๆ ประจำวันที่ช่วยให้กายและใจมั่นคง",
      "每天的小习惯，让身心保持稳定。",
      "心と体を安定させる、毎日の小さな習慣です。",
      "몸과 마음을 안정시키는 작은 일상 습관이에요.",
    ),
    nodes: [
      node(word.mindfulness, VIOLET),
      node(word.journaling, YELLOW),
      node(l("Time outdoors", "ใช้เวลากลางแจ้ง", "户外时间", "屋外で過ごす時間", "야외 시간"), GREEN),
      node(l("Social connection", "พบปะผู้คน", "社交联系", "人とのつながり", "사람과의 연결"), PINK, [
        node(word.family),
        node(word.friends),
      ]),
      node(l("Digital detox", "พักจากหน้าจอ", "数字排毒", "デジタルデトックス", "디지털 디톡스"), GRAY),
      node(word.hobbies, BLUE),
      node(word.rest, TEAL),
    ],
  },
  {
    id: "habit-tracker",
    category: "personal",
    name: l("Habit tracker", "ตัวติดตามนิสัย", "习惯追踪", "習慣トラッカー", "습관 트래커"),
    description: l(
      "Build habits by giving each one a time: morning, daytime and evening.",
      "สร้างนิสัยด้วยการให้เวลากับแต่ละอย่าง: เช้า ระหว่างวัน และเย็น",
      "给每个习惯安排时间：早晨、日间和晚上。",
      "習慣ごとに時間を決めます。朝、日中、夜。",
      "습관마다 시간을 정해요. 아침, 낮, 저녁.",
    ),
    nodes: [
      node(l("Morning habits", "นิสัยตอนเช้า", "晨间习惯", "朝の習慣", "아침 습관"), YELLOW, [
        node(l("Wake up on time", "ตื่นตรงเวลา", "按时起床", "時間通りに起きる", "제시간에 일어나기")),
        node(l("Drink water", "ดื่มน้ำ", "喝水", "水を飲む", "물 마시기")),
        node(l("Move your body", "ขยับร่างกาย", "活动身体", "体を動かす", "몸 움직이기")),
      ]),
      node(l("Daytime habits", "นิสัยระหว่างวัน", "日间习惯", "日中の習慣", "낮 습관"), BLUE, [
        node(word.reading),
        node(word.learning),
        node(word.journaling),
      ]),
      node(l("Evening habits", "นิสัยตอนเย็น", "晚间习惯", "夜の習慣", "저녁 습관"), VIOLET, [
        node(word.planTomorrow),
        node(word.windDown),
        node(l("Sleep on time", "นอนตรงเวลา", "按时睡觉", "時間通りに寝る", "제시간에 자기")),
      ]),
    ],
  },
  {
    id: "money-management",
    category: "personal",
    name: l("Money management", "การจัดการเงิน", "理财", "お金の管理", "돈 관리"),
    description: l(
      "Budget, bills, saving and growing your income, on a regular rhythm.",
      "งบประมาณ ค่าใช้จ่าย การออม และการเพิ่มรายได้ อย่างสม่ำเสมอ",
      "按固定节奏做预算、付账单、储蓄和增加收入。",
      "予算、支払い、貯蓄、収入アップを定期的に。",
      "예산, 청구서, 저축, 수입 늘리기를 꾸준히 해요.",
    ),
    nodes: [
      node(l("Budgeting", "จัดงบประมาณ", "预算", "予算管理", "예산 짜기"), BLUE),
      node(l("Bills and admin", "ค่าใช้จ่ายและเอกสาร", "账单与事务", "支払いと事務", "청구서와 행정"), GRAY),
      node(l("Saving and investing", "ออมและลงทุน", "储蓄与投资", "貯蓄と投資", "저축과 투자"), GREEN),
      node(l("Growing income", "เพิ่มรายได้", "增加收入", "収入を増やす", "수입 늘리기"), YELLOW, [
        node(word.sideProjects),
        node(word.learning),
      ]),
    ],
  },
  {
    id: "spiritual",
    category: "personal",
    name: l("Spiritual practice", "การปฏิบัติทางจิตวิญญาณ", "灵性修习", "スピリチュアルな実践", "영적 수행"),
    description: l(
      "Time for prayer or meditation, study, community and service.",
      "เวลาสำหรับการสวดมนต์หรือทำสมาธิ การศึกษา ชุมชน และการช่วยเหลือผู้อื่น",
      "留出时间用于祈祷或冥想、学习、社群与服务。",
      "祈りや瞑想、学び、コミュニティ、奉仕の時間を取ります。",
      "기도나 명상, 공부, 공동체, 봉사를 위한 시간이에요.",
    ),
    nodes: [
      node(l("Prayer or meditation", "สวดมนต์หรือทำสมาธิ", "祈祷或冥想", "祈りや瞑想", "기도 또는 명상"), VIOLET),
      node(l("Reading and study", "อ่านและศึกษา", "阅读与学习", "読書と学び", "읽기와 공부"), BLUE),
      node(word.community, ORANGE),
      node(l("Service and giving", "ช่วยเหลือและให้", "服务与奉献", "奉仕と分かち合い", "봉사와 나눔"), GREEN),
      node(l("Reflection and gratitude", "ใคร่ครวญและขอบคุณ", "反思与感恩", "内省と感謝", "성찰과 감사"), YELLOW),
    ],
  },
  {
    id: "trip-planning",
    category: "personal",
    name: l("Trip planning", "การวางแผนท่องเที่ยว", "旅行规划", "旅行の計画", "여행 계획"),
    description: l(
      "From research and booking to packing and exploring.",
      "ตั้งแต่ค้นหาข้อมูลและจอง ไปจนถึงเก็บกระเป๋าและออกสำรวจ",
      "从调研、预订到打包与探索。",
      "下調べや予約から、荷造りと現地散策まで。",
      "조사와 예약부터 짐 싸기와 둘러보기까지.",
    ),
    nodes: [
      node(word.research, BLUE),
      node(l("Booking", "จองที่พักและตั๋ว", "预订", "予約", "예약"), ORANGE),
      node(l("Packing", "เก็บกระเป๋า", "打包", "荷造り", "짐 싸기"), YELLOW),
      node(l("Travel days", "วันเดินทาง", "路上的日子", "移動日", "이동일"), TEAL),
      node(l("Exploring", "ออกสำรวจ", "探索", "散策", "둘러보기"), GREEN),
      node(l("Food and rest", "อาหารและพักผ่อน", "美食与休息", "食事と休憩", "식사와 휴식"), PINK),
      node(l("Photos and memories", "ภาพถ่ายและความทรงจำ", "照片与回忆", "写真と思い出", "사진과 추억"), VIOLET),
    ],
  },
];
