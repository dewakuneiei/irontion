// Register only the ECharts parts the app uses, to keep the bundle small.
import { BarChart, HeatmapChart, PieChart } from "echarts/charts";
import {
  AriaComponent,
  CalendarComponent,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  HeatmapChart,
  PieChart,
  AriaComponent,
  CalendarComponent,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export { echarts };
export type { EChartsCoreOption as ChartOption } from "echarts/core";
