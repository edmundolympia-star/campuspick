export type OrderStatus = "pending" | "ready" | "collected" | "cancelled";
export type PaymentMethod = "pickup" | "duitnow";

export type Vendor = {
  id: string;
  name: string;
  slug: string;
  description: string;
  heroMessage: string;
  subtext: string;
  logoUrl?: string;
  duitnowQrUrl?: string;
  paused?: boolean;
  pauseMessage?: string;
};

export type MenuItem = {
  id: string;
  vendorId: string;
  name: string;
  chineseName: string;
  description: string;
  price: number;
  dailyStock: number;
  available: boolean;
  imageUrl?: string;
};

export type PickupSlot = {
  id: string;
  vendorId: string;
  pickupTime: string;
  maxOrders: number;
  active: boolean;
};

export type OrderItem = {
  id: string;
  orderId: string;
  menuItemId: string;
  itemName: string;
  chineseName: string;
  quantity: number;
  unitPrice: number;
};

export type Order = {
  id: string;
  vendorId: string;
  orderNumber: string;
  customerName: string;
  phoneLast4: string;
  pickupTime: string;
  pickupDate: string;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
};

export type DemoState = {
  vendors: Vendor[];
  menuItems: MenuItem[];
  pickupSlots: PickupSlot[];
  orders: Order[];
};
