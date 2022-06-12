export interface ErrorInterface {
  message: string;
  field?: string;
}

export interface AuthDbRow {
  id: string;
  email: string;
}

export interface AuthApiReturnData {
  data?: AuthDbRow | null | undefined;
  currentUser?: AuthDbRow | null;
  errors?: ErrorDocument[];
}

export interface SkillApiDocument {
  _id: string;
  userId: string;
  name: string;
  version: number;
  resourceId: string[] | undefined;
  dbStatus?: skillActiveStatus;
}
export interface SkillApiReturnData {
  data: SkillApiDocument[];
  errors: ErrorDocument[];
}

export interface ErrorDocument {
  message: string;
  field: string;
}
export declare enum skillActiveStatus {
  active = "active",
  inactive = "inactive",
}

export interface ResourceApiDocument {
  _id: string;
  userId: string;
  name: string;
  type: string;
  learningStatus: number;
  version: number;
  description: string;
  skillId: string[];
  dbStatus: resourceActiveStatus;
}

export declare enum resourceActiveStatus {
  active = "active",
  inactive = "inactive",
}

export interface ResourceApiReturnData {
  data: ResourceApiDocument[];
  errors: ErrorDocument[];
}
