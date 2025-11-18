export interface AppConfig {
  tableName: string;
  stage: string;
}

export function loadConfig(env = process.env): AppConfig {
  return {
    tableName: env.TABLE_NAME || 'games',
    stage: env.STAGE || env.NODE_ENV || 'dev',
  };
}
