import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { z } from 'zod'

import { useForm } from '@hooks/useForm'
import { authService } from '@services/authService.ts'
import Button from '@components/UI/Button'
import Input from '@components/UI/Input'
import Card from '@components/UI/Card'
import toast from 'react-hot-toast'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address')
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

const ForgotPassword = () => {
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting,
    getFieldProps,
    getFieldError
  } = useForm<ForgotPasswordFormData>({
    initialValues: {
      email: ''
    },
    validationSchema: forgotPasswordSchema,
    onSubmit: async (values) => {
      try {
        await authService.requestPasswordReset(values)
        setIsSubmitted(true)
        toast.success('Password reset email sent!')
      } catch (error) {
        toast.error('Failed to send reset email. Please try again.')
      }
    }
  })

  if (isSubmitted) {
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
              Check your email
            </h1>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We've sent a password reset link to{' '}
              <span className="font-medium">{values.email}</span>
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Didn't receive the email? Check your spam folder or try again.
            </p>

            <div className="space-y-4">
              <Button
                onClick={() => setIsSubmitted(false)}
                variant="outline"
                fullWidth
              >
                Try another email
              </Button>
              
              <Link to="/login">
                <Button variant="ghost" fullWidth>
                  Back to sign in
                </Button>
              </Link>
            </div>
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
            Forgot password?
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            No worries, we'll send you reset instructions
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              {...getFieldProps('email')}
              type="email"
              label="Email address"
              placeholder="Enter your email"
              error={getFieldError('email')}
              autoComplete="email"
              required
            />

            <Button
              type="submit"
              fullWidth
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Send reset instructions
            </Button>
          </form>

          <div className="mt-6">
            <Link
              to="/login"
              className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Back to sign in</span>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}

export default ForgotPassword