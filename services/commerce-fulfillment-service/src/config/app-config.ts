const required = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing required env var: ${key}`);
  return v;
};
export const config = {
  port: parseInt(process.env.PORT || '3008', 10),
  databaseUrl: required('DATABASE_URL'),
  kafkaBrokers: (process.env.KAFKA_BROKERS || '').split(',').filter(Boolean),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
};
