import React, { useState } from 'react'
import { Link, useSearchParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { z } from 'zod'

import { useForm } from '@hooks/useForm'
import { authService } from '@services/authService'
import Button from '@components/UI/Button'
import Input from '@components/UI/Input'
import Card from '@components/UI/Card'
import toast from 'react-hot-toast'

const resetPasswordSchema = z.object({
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

const ResetPassword = () => {
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  
  const token = searchParams.get('token')

  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    getFieldProps,
    getFieldError
  } = useForm<ResetPasswordFormData>({
    initialValues: {
      password: '',
      confirmPassword: ''
    },
    validationSchema: resetPasswordSchema,
    onSubmit: async (values) => {
      if (!token) {
        toast.error('Invalid reset token')
        return
      }

      try {
        await authService.resetPassword({
          token,
          password: values.password,
          confirmPassword: values.confirmPassword
        })
        setIsCompleted(true)
        toast.success('Password reset successfully!')
      } catch (error) {
        toast.error('Failed to reset password. The link may have expired.')
      }
    }
  })

  // Redirect if no token
  if (!token) {
    return <Navigate to="/forgot-password" replace />
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Password reset successful
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Your password has been successfully reset. You can now sign in with your new password.
            </p>

            <Link to="/login">
              <Button fullWidth>
                Continue to sign in
              </Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    )
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
            Reset password
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enter your new password below
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              {...getFieldProps('password')}
              type={showPassword ? 'text' : 'password'}
              label="New password"
              placeholder="Enter your new password"
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
              label="Confirm new password"
              placeholder="Confirm your new password"
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

            <Button
              type="submit"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Reset password
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              Back to sign in
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

export default ResetPassword