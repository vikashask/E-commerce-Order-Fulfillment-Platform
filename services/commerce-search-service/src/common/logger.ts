export function log(level: string, msg: string, data?: Record<string, unknown>) {
  const entry = { time: new Date().toISOString(), level, msg, ...data };
  process.stdout.write(JSON.stringify(entry) + '\n');
}
