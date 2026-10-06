import type { ActivityTemplate } from "$lib/domain/templates";
import { BLUE, GRAY, GREEN, ORANGE, PINK, RED, TEAL, VIOLET, YELLOW, l, node, word } from "./words";

export const STUDENT_TEMPLATES: ActivityTemplate[] = [
  {
    id: "student",
    category: "student",
    name: l("Student day", "วันของนักเรียนนักศึกษา", "学生的一天", "学生の一日", "학생의 하루"),
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
        node(word.homework),
        node(word.revision),
        node(word.reading),
        node(l("Group project", "งานกลุ่ม", "小组项目", "グループ課題", "팀 프로젝트")),
      ]),
      node(word.health, GREEN, [node(word.sleep), node(word.exercise), node(word.meals)]),
      node(word.rest, YELLOW, [node(word.friends), node(word.hobbies), node(word.gaming)]),
    ],
  },
  {
    id: "university",
    category: "student",
    name: l("University student", "นักศึกษามหาวิทยาลัย", "大学生", "大学生", "대학생"),
    description: l(
      "Lectures, labs, assignments and self-study, with campus life and a job on the side.",
      "บรรยาย แล็บ งานที่ได้รับมอบหมาย และการเรียนด้วยตนเอง พร้อมชีวิตในมหาวิทยาลัยและงานพาร์ทไทม์",
      "讲座、实验、作业和自学，兼顾校园生活与兼职。",
      "講義、実験、課題、自習に、キャンパスライフとアルバイトも。",
      "강의, 실험, 과제, 자습에 캠퍼스 생활과 아르바이트까지.",
    ),
    nodes: [
      node(l("Lectures and labs", "บรรยายและแล็บ", "讲座与实验", "講義と実験", "강의와 실험"), BLUE),
      node(l("Self-study", "เรียนด้วยตนเอง", "自学", "自習", "자습"), VIOLET, [
        node(word.reading),
        node(word.revision),
        node(word.notes),
      ]),
      node(l("Assignments", "งานที่ได้รับมอบหมาย", "作业与论文", "課題", "과제"), RED),
      node(l("Group work", "งานกลุ่ม", "小组合作", "グループワーク", "팀 활동"), ORANGE),
      node(l("Campus life", "ชีวิตในมหาวิทยาลัย", "校园生活", "キャンパスライフ", "캠퍼스 생활"), PINK, [
        node(l("Clubs and societies", "ชมรม", "社团", "サークル", "동아리")),
        node(word.friends),
      ]),
      node(l("Part-time job", "งานพาร์ทไทม์", "兼职", "アルバイト", "아르바이트"), YELLOW),
      node(word.health, GREEN, [node(word.sleep), node(word.exercise), node(word.meals)]),
    ],
  },
  {
    id: "high-school",
    category: "student",
    name: l("High school student", "นักเรียนมัธยม", "高中生", "高校生", "고등학생"),
    description: l(
      "School, homework and revision, plus clubs, friends and plenty of rest.",
      "เรียน การบ้าน และทบทวน พร้อมชมรม เพื่อน และการพักผ่อนอย่างเพียงพอ",
      "上学、作业和复习，加上社团、朋友和充足休息。",
      "学校、宿題、復習に、部活や友だち、しっかり休息も。",
      "학교, 숙제, 복습에 동아리, 친구, 충분한 휴식까지.",
    ),
    nodes: [
      node(l("At school", "ที่โรงเรียน", "在学校", "学校", "학교에서"), BLUE, [
        node(word.classes),
        node(l("Lunch and breaks", "มื้อกลางวันและพัก", "午餐与课间", "昼食と休み時間", "점심과 쉬는 시간")),
      ]),
      node(word.homework, RED),
      node(word.revision, VIOLET),
      node(l("Clubs and sports", "ชมรมและกีฬา", "社团与运动", "部活動とスポーツ", "동아리와 운동"), ORANGE),
      node(l("Friends and family", "เพื่อนและครอบครัว", "朋友与家人", "友だちと家族", "친구와 가족"), PINK, [
        node(word.friends),
        node(word.family),
      ]),
      node(word.health, GREEN, [node(word.sleep), node(word.meals)]),
      node(l("Free time", "เวลาว่าง", "自由时间", "自由時間", "자유 시간"), YELLOW, [node(word.gaming), node(word.hobbies)]),
    ],
  },
  {
    id: "exam-prep",
    category: "student",
    name: l("Exam preparation", "เตรียมสอบ", "备考", "試験対策", "시험 준비"),
    description: l(
      "Cover the syllabus, practise past papers and look after yourself until exam day.",
      "ครอบคลุมเนื้อหา ทำข้อสอบเก่า และดูแลตัวเองจนถึงวันสอบ",
      "覆盖考纲、做真题，并在考前照顾好自己。",
      "範囲を網羅し、過去問を解き、本番まで体調も整えます。",
      "범위를 훑고 기출문제를 풀며 시험날까지 컨디션도 챙겨요.",
    ),
    nodes: [
      node(l("Learn the material", "เรียนเนื้อหา", "学习内容", "内容を学ぶ", "내용 익히기"), BLUE),
      node(l("Practice papers", "ทำข้อสอบเก่า", "做真题", "過去問演習", "기출문제 풀이"), RED),
      node(l("Weak spots", "จุดที่ยังอ่อน", "薄弱环节", "苦手分野", "약한 부분"), ORANGE),
      node(l("Memorizing", "ท่องจำ", "背诵", "暗記", "암기"), VIOLET),
      node(l("Mock exams", "สอบจำลอง", "模拟考试", "模擬試験", "모의시험"), YELLOW),
      node(word.health, GREEN, [node(word.sleep), node(word.exercise), node(word.meals)]),
      node(word.breaks, TEAL),
    ],
  },
  {
    id: "thesis",
    category: "student",
    name: l(
      "Thesis or PhD",
      "วิทยานิพนธ์ / ปริญญาเอก",
      "论文 / 博士研究",
      "論文・博士課程",
      "논문 / 박사 과정",
    ),
    description: l(
      "Reading, research, writing and your supervisor, steadily over months.",
      "การอ่าน วิจัย เขียน และการพบอาจารย์ที่ปรึกษา ทีละน้อยตลอดหลายเดือน",
      "阅读、研究、写作和导师指导，用数月稳步推进。",
      "文献、研究、執筆、指導教員との面談を、数か月かけて着実に。",
      "읽기, 연구, 글쓰기, 지도교수 면담을 몇 달에 걸쳐 꾸준히.",
    ),
    nodes: [
      node(l("Literature review", "ทบทวนวรรณกรรม", "文献综述", "文献レビュー", "문헌 검토"), BLUE, [
        node(word.reading),
        node(word.notes),
      ]),
      node(l("Research work", "งานวิจัย", "研究工作", "研究活動", "연구 작업"), VIOLET, [
        node(l("Experiments or fieldwork", "ทดลองหรือภาคสนาม", "实验或田野调查", "実験・フィールドワーク", "실험 또는 현장 조사")),
        node(word.analysis),
      ]),
      node(word.writing, RED, [node(word.drafting), node(word.editing)]),
      node(l("Supervisor meetings", "พบอาจารย์ที่ปรึกษา", "导师会面", "指導教員との面談", "지도교수 면담"), ORANGE),
      node(l("Seminars and talks", "สัมมนาและการบรรยาย", "研讨会与报告", "セミナーと発表", "세미나와 발표"), YELLOW),
      node(l("Wellbeing", "สุขภาวะ", "身心健康", "ウェルビーイング", "웰빙"), GREEN, [
        node(word.sleep),
        node(word.exercise),
      ]),
    ],
  },
  {
    id: "language-learning",
    category: "student",
    name: l("Language learning", "การเรียนภาษา", "语言学习", "語学学習", "언어 학습"),
    description: l(
      "A balanced mix of words, listening, speaking, reading and writing.",
      "ผสมผสานคำศัพท์ การฟัง การพูด การอ่าน และการเขียนอย่างสมดุล",
      "词汇、听力、口语、阅读和写作均衡搭配。",
      "語彙、リスニング、スピーキング、読み、書きをバランスよく。",
      "어휘, 듣기, 말하기, 읽기, 쓰기를 균형 있게.",
    ),
    nodes: [
      node(l("Vocabulary", "คำศัพท์", "词汇", "語彙", "어휘"), RED),
      node(l("Listening", "การฟัง", "听力", "リスニング", "듣기"), BLUE),
      node(l("Speaking", "การพูด", "口语", "スピーキング", "말하기"), ORANGE),
      node(word.reading, GREEN),
      node(word.writing, VIOLET),
      node(l("Grammar", "ไวยากรณ์", "语法", "文法", "문법"), YELLOW),
      node(l("Immersion", "เรียนรู้จากสื่อจริง", "沉浸式学习", "イマージョン", "몰입 학습"), PINK, [
        node(l("Videos and shows", "คลิปและซีรีส์", "视频与剧集", "動画と番組", "영상과 프로그램")),
        node(l("Music and podcasts", "เพลงและพ็อดคาสต์", "音乐与播客", "音楽とポッドキャスト", "음악과 팟캐스트")),
      ]),
    ],
  },
  {
    id: "online-learning",
    category: "student",
    name: l("Online learning", "การเรียนออนไลน์", "在线学习", "オンライン学習", "온라인 학습"),
    description: l(
      "Watch, practise and build, on a schedule you keep.",
      "ดู ฝึก และสร้างผลงาน ตามตารางที่คุณรักษาได้",
      "观看、练习、做项目，按你能坚持的节奏进行。",
      "見て、練習して、作る。続けられるスケジュールで。",
      "보고, 연습하고, 만들어요. 지킬 수 있는 일정으로.",
    ),
    nodes: [
      node(l("Video lessons", "บทเรียนวิดีโอ", "视频课程", "動画レッスン", "동영상 강의"), BLUE),
      node(word.practice, RED, [
        node(l("Exercises", "แบบฝึกหัด", "练习题", "演習問題", "연습 문제")),
        node(word.projects),
      ]),
      node(word.notes, YELLOW),
      node(l("Quizzes and assessments", "แบบทดสอบและประเมินผล", "测验与考核", "クイズと評価", "퀴즈와 평가"), VIOLET),
      node(l("Discussion and community", "พูดคุยและชุมชน", "讨论与社群", "ディスカッションとコミュニティ", "토론과 커뮤니티"), ORANGE),
      node(word.breaks, GREEN),
      node(word.admin, GRAY),
    ],
  },
];
