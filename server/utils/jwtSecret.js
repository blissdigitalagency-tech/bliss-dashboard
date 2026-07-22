const isProduction = process.env.NODE_ENV === 'production'
const DEV_SECRET = 'dev-secret-change-me'

if (isProduction && !process.env.JWT_SECRET) {
  console.error(
    'FATAL: JWT_SECRET environment variable must be set when NODE_ENV=production. ' +
      'Refusing to start with an insecure default secret.'
  )
  process.exit(1)
}

export const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET
export const isProd = isProduction
