import type { ActivityTemplate } from "$lib/domain/templates";
import { BLUE, DARK_GREEN, GRAY, GREEN, ORANGE, PINK, RED, TEAL, VIOLET, YELLOW, l, node, word } from "./words";

export const CARE_TEMPLATES: ActivityTemplate[] = [
  {
    id: "teacher",
    category: "care",
    name: l("Teacher", "ครู", "教师", "教師", "교사"),
    description: l(
      "Teaching, preparing, giving feedback and looking after your own time.",
      "การสอน การเตรียมการ การให้ข้อเสนอแนะ และการดูแลเวลาของตัวเอง",
      "授课、备课、反馈，也照顾好自己的时间。",
      "授業、準備、フィードバック、そして自分の時間も大切に。",
      "수업, 준비, 피드백, 그리고 나만의 시간까지 챙겨요.",
    ),
    nodes: [
      node(l("Teaching", "การสอน", "教学", "授業", "수업"), BLUE, [node(word.classes), node(word.prepLessons)]),
      node(word.marking, ORANGE),
      node(l("Supporting students", "ดูแลนักเรียน", "辅导学生", "生徒の支援", "학생 지원"), PINK, [
        node(l("Office hours", "ชั่วโมงให้คำปรึกษา", "答疑时间", "オフィスアワー", "상담 시간")),
        node(l("Parents and guardians", "ผู้ปกครอง", "家长沟通", "保護者対応", "학부모 상담")),
      ]),
      node(l("School admin", "งานธุรการโรงเรียน", "学校事务", "学校事務", "학교 행정"), GRAY, [
        node(word.meetings),
        node(word.paperwork),
      ]),
      node(l("Professional growth", "การพัฒนาวิชาชีพ", "专业成长", "専門性の向上", "전문성 개발"), VIOLET),
      node(word.rest, GREEN),
    ],
  },
  {
    id: "nurse",
    category: "care",
    name: l(
      "Nurse or healthcare worker",
      "พยาบาล / บุคลากรสาธารณสุข",
      "护士 / 医护人员",
      "看護師・医療従事者",
      "간호사 / 의료 종사자",
    ),
    description: l(
      "A shift of patient care, notes and handovers, with rest on both sides.",
      "กะการดูแลผู้ป่วย บันทึก และส่งเวร พร้อมการพักผ่อนทั้งก่อนและหลัง",
      "一个班次的病人护理、记录与交接，前后都要留出休息。",
      "患者ケア、記録、申し送りの勤務。前後の休息も確保します。",
      "환자 돌봄, 기록, 인수인계로 이루어진 근무. 전후 휴식도 챙겨요.",
    ),
    nodes: [
      node(l("Patient care", "ดูแลผู้ป่วย", "病人护理", "患者ケア", "환자 돌봄"), RED, [
        node(l("Rounds and checks", "เดินตรวจและเช็กอาการ", "查房与检查", "巡回と観察", "회진과 점검")),
        node(l("Medication", "ให้ยา", "用药", "投薬", "투약")),
      ]),
      node(l("Notes and records", "บันทึกและเวชระเบียน", "记录与病历", "記録とカルテ", "기록과 차트"), BLUE),
      node(l("Handover", "ส่งเวร", "交接班", "申し送り", "인수인계"), ORANGE),
      node(l("Team meetings and training", "ประชุมทีมและอบรม", "团队会议与培训", "チーム会議と研修", "팀 회의와 교육"), VIOLET),
      node(word.breaks, GREEN),
      node(l("Commute and rest", "เดินทางและพักผ่อน", "通勤与休息", "通勤と休息", "출퇴근과 휴식"), TEAL, [
        node(word.commute),
        node(word.sleep),
      ]),
    ],
  },
  {
    id: "doctor",
    category: "care",
    name: l("Doctor", "แพทย์", "医生", "医師", "의사"),
    description: l(
      "Consultations, rounds and paperwork, with time to keep learning and to rest.",
      "ตรวจรักษา เดินตรวจผู้ป่วย และเอกสาร พร้อมเวลาเรียนรู้ต่อเนื่องและพักผ่อน",
      "门诊、查房和文书，也留时间持续学习与休息。",
      "診察、回診、書類仕事に、学び続ける時間と休息も。",
      "진료, 회진, 서류 업무에 계속 배우고 쉴 시간까지.",
    ),
    nodes: [
      node(l("Consultations", "ตรวจรักษา", "门诊", "診察", "진료"), RED),
      node(l("Ward rounds", "เดินตรวจผู้ป่วยใน", "查房", "回診", "병동 회진"), ORANGE),
      node(l("Procedures", "หัตถการ", "手术与操作", "処置・手術", "시술"), VIOLET),
      node(word.paperwork, GRAY),
      node(word.meetings, BLUE),
      node(l("Learning and research", "เรียนรู้และวิจัย", "学习与研究", "学びと研究", "배움과 연구"), DARK_GREEN),
      node(word.rest, GREEN),
    ],
  },
  {
    id: "therapist",
    category: "care",
    name: l(
      "Therapist or counselor",
      "นักบำบัด / นักให้คำปรึกษา",
      "咨询师 / 治疗师",
      "セラピスト／カウンセラー",
      "상담사 / 치료사",
    ),
    description: l(
      "Sessions, notes and supervision, with time to look after yourself.",
      "การพบผู้รับบริการ บันทึก และการกำกับดูแล พร้อมเวลาดูแลตัวเอง",
      "咨询、记录与督导，也要留时间照顾自己。",
      "セッション、記録、スーパービジョンに、自分をケアする時間も。",
      "상담 세션, 기록, 슈퍼비전에 나를 돌볼 시간까지.",
    ),
    nodes: [
      node(word.clientSessions, BLUE),
      node(l("Session notes", "บันทึกการพบ", "咨询记录", "セッション記録", "세션 기록"), VIOLET),
      node(l("Supervision and learning", "การกำกับดูแลและเรียนรู้", "督导与学习", "スーパービジョンと学び", "슈퍼비전과 배움"), ORANGE),
      node(word.admin, GRAY),
      node(l("Self-care", "ดูแลตัวเอง", "自我关怀", "セルフケア", "셀프 케어"), GREEN, [
        node(word.mindfulness),
        node(word.exercise),
      ]),
    ],
  },
  {
    id: "lecturer",
    category: "care",
    name: l("University lecturer", "อาจารย์มหาวิทยาลัย", "大学讲师", "大学講師", "대학 강사"),
    description: l(
      "Teaching, research, marking and supervision, kept in balance.",
      "การสอน วิจัย ตรวจงาน และดูแลนักศึกษา อย่างสมดุล",
      "教学、科研、批改和指导，保持平衡。",
      "授業、研究、採点、指導をバランスよく。",
      "강의, 연구, 채점, 지도를 균형 있게.",
    ),
    nodes: [
      node(l("Teaching", "การสอน", "授课", "授業", "강의"), BLUE, [node(word.classes), node(word.prepLessons)]),
      node(word.research, VIOLET, [node(word.reading), node(word.writing)]),
      node(word.marking, ORANGE),
      node(l("Student supervision", "ดูแลนักศึกษา", "指导学生", "学生の指導", "학생 지도"), PINK),
      node(l("Committees and admin", "คณะกรรมการและงานธุรการ", "委员会与行政", "委員会と事務", "위원회와 행정"), GRAY),
      node(word.rest, GREEN),
    ],
  },
  {
    id: "coach",
    category: "care",
    name: l("Coach or trainer", "โค้ช / ผู้ฝึกสอน", "教练 / 培训师", "コーチ／トレーナー", "코치 / 트레이너"),
    description: l(
      "Sessions with clients, planning programs and growing your practice.",
      "การพบลูกค้า การวางโปรแกรม และการพัฒนางานของคุณ",
      "与客户的会面、制定方案并发展你的业务。",
      "クライアントとのセッション、プログラム作成、活動の成長。",
      "고객 세션, 프로그램 설계, 내 일의 성장.",
    ),
    nodes: [
      node(word.clientSessions, BLUE),
      node(l("Planning programs", "วางโปรแกรม", "制定方案", "プログラム作成", "프로그램 설계"), VIOLET),
      node(l("Client check-ins", "ติดตามลูกค้า", "客户回访", "クライアントのフォロー", "고객 점검"), ORANGE),
      node(word.marketing, YELLOW),
      node(word.learning, DARK_GREEN),
      node(word.admin, GRAY),
    ],
  },
];
