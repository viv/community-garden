import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'
import { z } from 'zod'

import { useAuth } from '@hooks/useAuth'
import { useForm } from '@hooks/useForm'
import Button from '@components/UI/Button'
import Input from '@components/UI/Input'
import Card from '@components/UI/Card'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
}).refine((data) => data.agreeToTerms, {
  message: "You must agree to the terms and conditions",
  path: ["agreeToTerms"]
})

type RegisterFormData = z.infer<typeof registerSchema>

const Register = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register, isAuthenticated, isLoading } = useAuth()

  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    getFieldProps,
    getFieldError,
    hasFieldError
  } = useForm<RegisterFormData>({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    },
    validationSchema: registerSchema,
    onSubmit: async (values) => {
      await register(values)
    }
  })

  // Redirect if already authenticated
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center text-white text-2xl mb-4">
            🌱
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Join Garden Hub
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create your account to start gardening
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              {...getFieldProps('name')}
              type="text"
              label="Full name"
              placeholder="Enter your full name"
              error={getFieldError('name')}
              autoComplete="name"
              required
            />

            <Input
              {...getFieldProps('email')}
              type="email"
              label="Email address"
              placeholder="Enter your email"
              error={getFieldError('email')}
              autoComplete="email"
              required
            />

            <Input
              {...getFieldProps('password')}
              type={showPassword ? 'text' : 'password'}
              label="Password"
              placeholder="Create a password"
              error={getFieldError('password')}
              helperText="Must be at least 8 characters with uppercase, lowercase, and number"
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              }
              required
            />

            <Input
              {...getFieldProps('confirmPassword')}
              type={showConfirmPassword ? 'text' : 'password'}
              label="Confirm password"
              placeholder="Confirm your password"
              error={getFieldError('confirmPassword')}
              autoComplete="new-password"
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              }
              required
            />

            <div>
              <label className="flex items-start space-x-2">
                <input
                  {...getFieldProps('agreeToTerms')}
                  type="checkbox"
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
                />
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  I agree to the{' '}
                  <a href="#" className="text-green-600 hover:text-green-500 font-medium">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-green-600 hover:text-green-500 font-medium">
                    Privacy Policy
                  </a>
                </span>
              </label>
              {hasFieldError('agreeToTerms') && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {getFieldError('agreeToTerms')}
                </p>
              )}
            </div>

            <Button
              type="submit"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Create account
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-green-600 hover:text-green-500"
              >
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

export default Register