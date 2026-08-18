export const homeData = {
  user: {
    name: "张三",
    major: "地质工程专业",
    grade: "2022级",
  },
  route: {
    name: "华山地质实习路线",
    startDate: "2024-05-20",
  },
  progress: {
    label: "今日进度",
    current: null,
    total: null,
    status: "loading",
  },
  stats: [
    { label: "已签到", value: 5, unit: "个点", icon: "clover" },
    { label: "观察记录", value: 3, unit: "条", icon: "notebook" },
  ],
  recent: {
    label: "最近活动",
    time: "10:32",
    action: "签到成功",
    location: "石灰岩露头观察点",
  },
};

export const navigationItems = [
  { id: "home", label: "首页", icon: "home" },
  { id: "map", label: "地图", icon: "map" },
  { id: "observe", label: "观察", icon: "frog" },
  { id: "record", label: "记录", icon: "record" },
  { id: "report", label: "报告", icon: "report" },
  { id: "profile", label: "我的", icon: "profile" },
];
