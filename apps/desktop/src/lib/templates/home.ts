import type { ActivityTemplate } from "$lib/domain/templates";
import { BLUE, GRAY, GREEN, ORANGE, PINK, VIOLET, YELLOW, l, node, word } from "./words";

export const HOME_TEMPLATES: ActivityTemplate[] = [
  {
    id: "household",
    category: "home",
    name: l("Household chores", "งานบ้าน", "家务", "家事", "집안일"),
    description: l(
      "Keep the home running: cleaning, laundry, cooking, shopping and repairs.",
      "ดูแลบ้านให้เรียบร้อย: ทำความสะอาด ซักผ้า ทำอาหาร ซื้อของ และซ่อมแซม",
      "让家运转顺畅：清洁、洗衣、做饭、购物和维修。",
      "家を回す：掃除、洗濯、料理、買い物、修繕。",
      "집을 잘 돌아가게: 청소, 빨래, 요리, 장보기, 수리.",
    ),
    nodes: [
      node(word.cleaning, BLUE, [
        node(l("Kitchen", "ครัว", "厨房", "キッチン", "주방")),
        node(l("Bathroom", "ห้องน้ำ", "浴室", "お風呂・トイレ", "욕실")),
        node(l("Living areas", "พื้นที่ใช้สอย", "起居空间", "リビング", "생활 공간")),
      ]),
      node(l("Laundry", "ซักผ้า", "洗衣", "洗濯", "빨래"), PINK),
      node(word.cooking, YELLOW),
      node(word.shopping, GREEN),
      node(l("Repairs and maintenance", "ซ่อมแซมและบำรุง", "维修与保养", "修繕とメンテナンス", "수리와 관리"), ORANGE),
      node(l("Bills and admin", "ค่าใช้จ่ายและเอกสาร", "账单与事务", "支払いと事務", "청구서와 행정"), GRAY),
    ],
  },
  {
    id: "parent",
    category: "home",
    name: l("Parent", "พ่อแม่", "父母", "親", "부모"),
    description: l(
      "Care for the kids, the home and yourself, with time left for the two of you.",
      "ดูแลลูก บ้าน และตัวเอง พร้อมเวลาสำหรับคุณสองคน",
      "照顾孩子、家和自己，也留出夫妻相处的时间。",
      "子ども、家、自分のケアに加えて、二人の時間も。",
      "아이, 집, 나를 돌보고 둘만의 시간도 남겨요.",
    ),
    nodes: [
      node(l("Kids' care", "ดูแลลูก", "照顾孩子", "子どものケア", "아이 돌봄"), PINK, [
        node(l("Morning routine for kids", "กิจวัตรตอนเช้าของลูก", "孩子的晨间流程", "子どもの朝の支度", "아이 아침 준비")),
        node(l("School run", "รับส่งโรงเรียน", "接送上学", "送り迎え", "등하원")),
        node(l("Homework help", "ช่วยทำการบ้าน", "辅导作业", "宿題のサポート", "숙제 도와주기")),
        node(l("Bedtime routine", "กิจวัตรก่อนนอน", "睡前流程", "寝かしつけ", "잠자리 루틴")),
      ]),
      node(l("Play and family time", "เล่นและเวลาครอบครัว", "玩耍与家庭时间", "遊びと家族の時間", "놀이와 가족 시간"), ORANGE),
      node(word.chores, BLUE, [node(word.cooking), node(word.cleaning)]),
      node(l("Time with partner", "เวลากับคู่ชีวิต", "与伴侣相处", "パートナーとの時間", "파트너와의 시간"), VIOLET),
      node(word.personalTime, GREEN),
    ],
  },
  {
    id: "new-parent",
    category: "home",
    name: l("New parent", "พ่อแม่มือใหม่", "新手父母", "新米パパ・ママ", "초보 부모"),
    description: l(
      "Feeding, care and sleep around the clock, with real time to rest.",
      "การให้นม การดูแล และการนอนตลอดวัน พร้อมเวลาพักผ่อนจริง ๆ",
      "全天候的喂养、照护与睡眠，也要留出真正的休息时间。",
      "授乳、お世話、睡眠が一日中。本当に休む時間も確保します。",
      "하루 종일 수유, 돌봄, 수면. 진짜 쉬는 시간도 챙겨요.",
    ),
    nodes: [
      node(l("Feeding", "ให้นม", "喂养", "授乳・食事", "수유·식사"), YELLOW),
      node(l("Diapers and care", "เปลี่ยนผ้าอ้อมและดูแล", "换尿布与护理", "おむつとお世話", "기저귀와 돌봄"), PINK),
      node(l("Baby's sleep", "การนอนของลูก", "宝宝睡眠", "赤ちゃんの睡眠", "아기 수면"), VIOLET),
      node(l("Your rest and recovery", "พักผ่อนและฟื้นตัวของคุณ", "你的休息与恢复", "自分の休息と回復", "나의 휴식과 회복"), GREEN, [
        node(word.sleep),
        node(word.meals),
      ]),
      node(word.appointments, BLUE),
      node(l("Help from others", "ความช่วยเหลือจากผู้อื่น", "他人的帮助", "周りのサポート", "다른 사람의 도움"), ORANGE),
    ],
  },
  {
    id: "caregiver",
    category: "home",
    name: l("Caregiver", "ผู้ดูแล", "照护者", "介護者", "돌봄 제공자"),
    description: l(
      "Looking after someone you love, without losing yourself.",
      "ดูแลคนที่คุณรัก โดยไม่ทิ้งตัวเอง",
      "照顾所爱的人，同时不失去自己。",
      "大切な人を支えながら、自分を見失わないために。",
      "사랑하는 사람을 돌보면서 나를 잃지 않도록.",
    ),
    nodes: [
      node(l("Daily care", "การดูแลประจำวัน", "日常照护", "日常のケア", "일상 돌봄"), PINK, [
        node(word.meals),
        node(l("Medication", "ยา", "用药", "服薬", "약 챙기기")),
        node(l("Personal care", "ดูแลสุขอนามัย", "个人护理", "身の回りのケア", "개인 위생 돌봄")),
      ]),
      node(word.appointments, BLUE),
      node(word.chores, ORANGE),
      node(l("Time together", "เวลาอยู่ด้วยกัน", "陪伴时间", "一緒に過ごす時間", "함께하는 시간"), YELLOW),
      node(l("Time for yourself", "เวลาของคุณเอง", "你自己的时间", "自分のための時間", "나를 위한 시간"), GREEN),
      node(l("Asking for support", "ขอความช่วยเหลือ", "寻求支持", "サポートを頼む", "도움 요청하기"), VIOLET),
    ],
  },
  {
    id: "pets",
    category: "home",
    name: l("Pet care", "ดูแลสัตว์เลี้ยง", "宠物照护", "ペットのお世話", "반려동물 돌봄"),
    description: l(
      "Walks, meals, play and the vet, kept on a routine your pet can count on.",
      "เดินเล่น อาหาร เล่น และพาไปหาหมอ ตามกิจวัตรที่สัตว์เลี้ยงไว้ใจได้",
      "遛弯、喂食、玩耍和看兽医，保持宠物能依赖的规律。",
      "散歩、食事、遊び、通院を、ペットが安心できる習慣に。",
      "산책, 식사, 놀이, 병원을 반려동물이 믿을 수 있는 루틴으로.",
    ),
    nodes: [
      node(l("Walks", "พาเดินเล่น", "遛弯", "散歩", "산책"), GREEN),
      node(l("Feeding", "ให้อาหาร", "喂食", "食事", "먹이 주기"), YELLOW),
      node(l("Play and training", "เล่นและฝึก", "玩耍与训练", "遊びとしつけ", "놀이와 훈련"), ORANGE),
      node(l("Grooming and cleaning", "แต่งขนและทำความสะอาด", "美容与清洁", "お手入れと掃除", "손질과 청소"), PINK),
      node(l("Vet and health", "สัตวแพทย์และสุขภาพ", "兽医与健康", "病院と健康管理", "병원과 건강"), BLUE),
    ],
  },
  {
    id: "retirement",
    category: "home",
    name: l("Retirement", "ชีวิตหลังเกษียณ", "退休生活", "リタイア生活", "은퇴 생활"),
    description: l(
      "Time for hobbies, family, health, learning and giving back.",
      "เวลาสำหรับงานอดิเรก ครอบครัว สุขภาพ การเรียนรู้ และการตอบแทนสังคม",
      "留给爱好、家人、健康、学习和回馈社会的时间。",
      "趣味、家族、健康、学び、社会貢献のための時間。",
      "취미, 가족, 건강, 배움, 나눔을 위한 시간이에요.",
    ),
    nodes: [
      node(word.hobbies, YELLOW, [
        node(l("Gardening", "ทำสวน", "园艺", "ガーデニング", "정원 가꾸기")),
        node(l("Crafts", "งานฝีมือ", "手工", "手芸", "공예")),
      ]),
      node(l("Family and friends", "ครอบครัวและเพื่อน", "家人和朋友", "家族と友人", "가족과 친구"), ORANGE, [
        node(word.family),
        node(word.friends),
      ]),
      node(word.health, GREEN, [
        node(l("Walking", "เดิน", "散步", "ウォーキング", "걷기")),
        node(word.exercise),
        node(l("Check-ups", "ตรวจสุขภาพ", "体检", "健康診断", "건강 검진")),
      ]),
      node(word.learning, VIOLET),
      node(word.travel, BLUE),
      node(l("Volunteering", "จิตอาสา", "志愿服务", "ボランティア", "봉사 활동"), PINK),
    ],
  },
];
