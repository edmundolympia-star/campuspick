import type { DemoState } from "./types";

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const initialState: DemoState = {
  vendors: [
    {
      id: "vendor-riceball",
      name: "Rice Ball @ Campus",
      slug: "riceball-campus",
      description: "今天的饭团，先订，再来拿。",
      heroMessage: "今天的饭团，先订，再来拿。",
      subtext: "无需排队 · 选择取餐时间 · 到店直接取",
      duitnowQrUrl: ""
    }
  ],
  menuItems: [
    {
      id: "teriyaki",
      vendorId: "vendor-riceball",
      name: "Teriyaki Chicken Rice Ball",
      chineseName: "照烧鸡饭团",
      description: "炙烤照烧鸡、米饭、海苔与清爽小菜。",
      price: 8.9,
      dailyStock: 40,
      available: true
    },
    {
      id: "spicy-tuna",
      vendorId: "vendor-riceball",
      name: "Spicy Tuna Rice Ball",
      chineseName: "辣味金枪鱼饭团",
      description: "微辣金枪鱼拌酱，适合午餐快速补能。",
      price: 9.5,
      dailyStock: 35,
      available: true
    },
    {
      id: "unagi",
      vendorId: "vendor-riceball",
      name: "Unagi Tamago Rice Ball",
      chineseName: "鳗鱼玉子饭团",
      description: "蒲烧鳗鱼与厚蛋烧，口感更丰富。",
      price: 10,
      dailyStock: 25,
      available: true
    }
  ],
  pickupSlots: [
    { id: "slot-1130", vendorId: "vendor-riceball", pickupTime: "11:30", maxOrders: 15, active: true },
    { id: "slot-1200", vendorId: "vendor-riceball", pickupTime: "12:00", maxOrders: 20, active: true },
    { id: "slot-1230", vendorId: "vendor-riceball", pickupTime: "12:30", maxOrders: 20, active: true },
    { id: "slot-1300", vendorId: "vendor-riceball", pickupTime: "13:00", maxOrders: 20, active: true },
    { id: "slot-1330", vendorId: "vendor-riceball", pickupTime: "13:30", maxOrders: 20, active: true }
  ],
  orders: []
};

export const formatMoney = (value: number) => `RM${value.toFixed(2)}`;
