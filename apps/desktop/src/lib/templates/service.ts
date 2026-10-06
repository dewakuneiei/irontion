import type { ActivityTemplate } from "$lib/domain/templates";
import { BLUE, DARK_GREEN, GRAY, GREEN, ORANGE, RED, TEAL, VIOLET, YELLOW, l, node, word } from "./words";

export const SERVICE_TEMPLATES: ActivityTemplate[] = [
  {
    id: "chef",
    category: "service",
    name: l("Chef or cook", "เชฟ / พ่อครัวแม่ครัว", "厨师", "シェフ・料理人", "셰프 / 요리사"),
    description: l(
      "Prep, service and cleaning, with time to plan menus and order stock.",
      "เตรียมวัตถุดิบ ให้บริการ และทำความสะอาด พร้อมเวลาวางเมนูและสั่งของ",
      "备料、出餐与清洁，并留时间规划菜单和订货。",
      "仕込み、提供、片づけに、メニュー作りと発注の時間も。",
      "준비, 서비스, 청소에 메뉴 구상과 재료 주문 시간도.",
    ),
    nodes: [
      node(l("Prep", "เตรียมวัตถุดิบ", "备料", "仕込み", "재료 준비"), YELLOW),
      node(l("Service", "ให้บริการ", "出餐服务", "営業・提供", "서비스"), RED),
      node(word.cleaning, BLUE),
      node(l("Menu planning", "วางเมนู", "菜单规划", "メニュー作り", "메뉴 구상"), VIOLET),
      node(l("Ordering and stock", "สั่งของและสต็อก", "订货与库存", "発注と在庫", "주문과 재고"), ORANGE),
      node(word.learning, DARK_GREEN),
    ],
  },
  {
    id: "retail",
    category: "service",
    name: l("Retail worker", "พนักงานขายหน้าร้าน", "零售员工", "販売スタッフ", "매장 직원"),
    description: l(
      "Serving customers, stocking shelves and keeping the shop tidy.",
      "ให้บริการลูกค้า เติมสินค้า และดูแลร้านให้เรียบร้อย",
      "接待顾客、补货并保持店面整洁。",
      "接客、品出し、店内の整理整頓。",
      "고객 응대, 진열, 매장 정리.",
    ),
    nodes: [
      node(l("Serving customers", "ให้บริการลูกค้า", "接待顾客", "接客", "고객 응대"), BLUE),
      node(l("Till and payments", "แคชเชียร์และชำระเงิน", "收银与付款", "レジと会計", "계산대와 결제"), ORANGE),
      node(l("Stock and shelves", "สต็อกและชั้นวาง", "库存与货架", "在庫と陳列", "재고와 진열"), YELLOW),
      node(l("Tidying and cleaning", "จัดระเบียบและทำความสะอาด", "整理与清洁", "整理と清掃", "정리와 청소"), GREEN),
      node(word.training, VIOLET),
      node(word.breaks, TEAL),
    ],
  },
  {
    id: "farmer",
    category: "service",
    name: l("Farmer or gardener", "เกษตรกร / คนทำสวน", "农民 / 园丁", "農家・園芸家", "농부 / 정원사"),
    description: l(
      "Planting, tending, harvesting and selling, around the seasons.",
      "เพาะปลูก ดูแล เก็บเกี่ยว และขาย ตามฤดูกาล",
      "随着季节播种、照料、收获与销售。",
      "季節に合わせて、植え付け、世話、収穫、販売。",
      "계절에 맞춰 심고, 가꾸고, 수확하고, 판매해요.",
    ),
    nodes: [
      node(l("Planting", "เพาะปลูก", "播种", "植え付け", "파종"), GREEN),
      node(l("Watering and tending", "รดน้ำและดูแล", "浇水与照料", "水やりと世話", "물주기와 관리"), BLUE),
      node(l("Harvesting", "เก็บเกี่ยว", "收获", "収穫", "수확"), YELLOW),
      node(l("Selling and delivery", "ขายและส่งสินค้า", "销售与配送", "販売と配送", "판매와 배송"), ORANGE),
      node(l("Equipment and repairs", "เครื่องมือและซ่อมแซม", "设备与维修", "機械と修理", "장비와 수리"), GRAY),
      node(l("Planning and records", "วางแผนและบันทึก", "规划与记录", "計画と記録", "계획과 기록"), VIOLET),
    ],
  },
  {
    id: "driver",
    category: "service",
    name: l(
      "Driver or courier",
      "คนขับ / พนักงานส่งของ",
      "司机 / 快递员",
      "ドライバー／配達員",
      "운전기사 / 배달원",
    ),
    description: l(
      "Driving, deliveries and breaks, with time for your vehicle and your rest.",
      "ขับรถ ส่งของ และพัก พร้อมเวลาดูแลรถและพักผ่อน",
      "驾驶、配送与休息，并留时间保养车辆。",
      "運転、配達、休憩に、車両の手入れと休息の時間も。",
      "운전, 배달, 휴식에 차량 관리와 쉬는 시간까지.",
    ),
    nodes: [
      node(l("Driving", "ขับรถ", "驾驶", "運転", "운전"), BLUE),
      node(l("Pick-ups and deliveries", "รับและส่งสินค้า", "取件与配送", "集荷と配達", "수거와 배송"), ORANGE),
      node(l("Waiting and loading", "รอและขนสินค้า", "等待与装卸", "待機と積み込み", "대기와 상하차"), GRAY),
      node(l("Vehicle care", "ดูแลรถ", "车辆保养", "車両の手入れ", "차량 관리"), YELLOW),
      node(word.paperwork, VIOLET),
      node(word.breaks, GREEN),
      node(word.rest, TEAL),
    ],
  },
];
