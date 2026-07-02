// Database enums (matching the PostgreSQL schema)

export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  BANNED = "BANNED",
}

export enum OrderStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum StockStatus {
  AVAILABLE = "AVAILABLE",
  RESERVED = "RESERVED",
  DELIVERED = "DELIVERED",
}

export enum WarrantyType {
  LOGIN = "LOGIN",
  CUSTOM = "CUSTOM",
  NONE = "NONE",
}

export enum WarrantyUnit {
  HOUR = "HOUR",
  DAY = "DAY",
  MONTH = "MONTH",
  YEAR = "YEAR",
}

export enum CouponDiscountType {
  PERCENT = "PERCENT",
  FIXED = "FIXED",
}

export enum CouponVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
}

export enum FulfillmentType {
  IN_STOCK = "IN_STOCK",
  PREORDER = "PREORDER",
}

export enum MessageKind {
  TEXT = "TEXT",
  WARRANTY_REQUEST = "WARRANTY_REQUEST",
  SYSTEM = "SYSTEM",
}

export enum WarrantyRequestStatus {
  OPEN = "OPEN",
  REPLACED = "REPLACED",
  REFUNDED = "REFUNDED",
  REJECTED = "REJECTED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  FAILED = "FAILED",
}

export enum PaymentMethod {
  BINANCE = "BINANCE",
  BALANCE = "BALANCE",
  BALANCE_VND = "BALANCE_VND",
  CRYPTO = "CRYPTO",
  BANK = "BANK",
}

export enum Currency {
  USDT = "USDT",
  VND = "VND",
}

export enum Language {
  EN = "EN",
  VI = "VI",
  RU = "RU",
  ZH = "ZH",
}

export enum PointTxType {
  EARN = "EARN",
  SPEND = "SPEND",
}
