export type DeliveryStatus =
  | "criada"
  | "em_producao"
  | "pausada"
  | "aguardando_revisao"
  | "em_ajuste"
  | "bloqueada"
  | "entregue"
  | "cancelada";

export type DeliveryPriority = "baixa" | "normal" | "alta" | "urgente";

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  criada: "Criada",
  em_producao: "Em produção",
  pausada: "Pausada",
  aguardando_revisao: "Aguardando revisão",
  em_ajuste: "Em ajuste",
  bloqueada: "Bloqueada",
  entregue: "Entregue",
  cancelada: "Cancelada",
};

export const PRIORITY_LABEL: Record<DeliveryPriority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export interface Delivery {
  id: string;
  clientName: string;
  projectName?: string;
  deliveryType: string;
  quantity: number;
  title: string;
  assigneeName: string;
  assigneeAvatarUrl?: string;
  assigneeColor?: string;
  status: DeliveryStatus;
  priority: DeliveryPriority;
  dueAt?: string; // ISO
  referenceUrl?: string;
  deliveryUrl?: string;
  notes?: string;
  estimateMinutes?: number;
  effortPoints?: number;
  adjustmentCount: number;
  activeSessionStartedAt?: string; // ISO — presente quando cronômetro está rodando
  activeSecondsAccumulated: number; // segundos já acumulados em sessões anteriores
  originalSeconds?: number;
  adjustmentSeconds?: number;
  adjustments?: DeliveryAdjustment[];
}

export interface DeliveryAdjustment {
  id: string;
  description: string;
  createdAt: string;
  completedAt?: string;
  seconds: number;
}

export interface ActiveDeliveryTimer {
  deliveryId: string;
  startedAt: string;
  baseSeconds: number;
  clientName: string;
  deliveryType: string;
  title: string;
  assigneeName: string;
  designerColor: string;
}

export interface CreateDeliveryInput {
  clientName: string;
  deliveryType: string;
  quantity: number;
}

export interface TeamMemberCapacity {
  userId: string;
  name: string;
  avatarUrl?: string;
  weeklyCapacityHours: number;
  weeklyCapacityPoints: number;
  committedHours: number;
  committedPoints: number;
}
