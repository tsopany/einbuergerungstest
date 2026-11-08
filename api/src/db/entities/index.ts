import type { EntitySchema } from "@mikro-orm/core";
import { Answers } from "./answers";
import { Exams } from "./exams";
import { Identities } from "./identities";
import { RefreshTokens } from "./refresh_tokens";
import { UserMeta } from "./user_meta";
import { Users } from "./users";

export { Answers, Exams, Identities, RefreshTokens, UserMeta, Users };

export const allEntities: EntitySchema<any, any>[] = [Users, Identities, RefreshTokens, Exams, Answers, UserMeta];
