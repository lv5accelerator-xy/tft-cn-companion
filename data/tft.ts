export type EntryType = "阵容" | "英雄" | "装备" | "羁绊";

export type TftEntry = {
  type: EntryType;
  nameZh: string;
  nameEn: string;
  summary: string;
  tags: string[];
};

export const patchInfo = {
  set: "Set 18 · Enchanted Wilds",
  patch: "18.1",
  updated: "2026-09-08",
};

export const entries: TftEntry[] = [
  {
    type: "装备",
    nameZh: "朔极之矛",
    nameEn: "Spear of Shojin",
    summary: "常见法系/技能启动装备。适合依赖频繁施法的后排主C或功能型单位。",
    tags: ["暴风大剑", "女神之泪", "回蓝"],
  },
  {
    type: "装备",
    nameZh: "鬼索的狂暴之刃",
    nameEn: "Guinsoo's Rageblade",
    summary: "持续作战型攻速装备，适合依赖普攻叠加输出的主C。",
    tags: ["无用大棒", "反曲之弓", "攻速"],
  },
  {
    type: "装备",
    nameZh: "无尽之刃",
    nameEn: "Infinity Edge",
    summary: "物理爆发型装备，通常用于AD主C。",
    tags: ["暴风大剑", "拳套", "暴击"],
  },
  {
    type: "英雄",
    nameZh: "金克丝",
    nameEn: "Jinx",
    summary: "示例英雄条目。后续会接入当前版本完整英雄数据和中英名称。",
    tags: ["AD", "后排", "示例"],
  },
  {
    type: "羁绊",
    nameZh: "版本羁绊资料",
    nameEn: "Trait Library",
    summary: "V0.1 先完成检索框架；下一步自动接入当前 Set 18 完整羁绊列表。",
    tags: ["Set 18", "中英对照"],
  },
  {
    type: "阵容",
    nameZh: "收藏阵容工作区",
    nameEn: "Comp Planner",
    summary: "用于开局前锁定 2–4 套目标阵容，并快速查看装备、关键单位和运营节点。",
    tags: ["规划", "收藏", "副屏"],
  },
];
