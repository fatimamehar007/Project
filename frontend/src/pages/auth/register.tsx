import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { isValidAadhaar, isValidPhone } from '@/lib/utils';

const registerSchema = z.object({
  aadhaarNumber: z
    .string()
    .refine(isValidAadhaar, 'Please enter a valid 12-digit Aadhaar number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  phoneNumber: z
    .string()
    .refine(isValidPhone, 'Please enter a valid Indian phone number'),
  preferredLanguage: z.string().min(1, 'Please select your preferred language'),
});

type RegisterForm = z.infer<typeof registerSchema>;

const SUPPORTED_LANGUAGES = [
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'ml', label: 'മലയാളം (Malayalam)' },
  { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { value: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
];

const RegisterPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingAadhaar, setIsVerifyingAadhaar] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setAuth } = useAuthStore();

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      aadhaarNumber: '',
      name: '',
      email: '',
      password: '',
      phoneNumber: '',
      preferredLanguage: '',
    },
  });

  const verifyAadhaar = async (aadhaarNumber: string) => {
    setIsVerifyingAadhaar(true);
    try {
      // Here you would integrate with the actual Aadhaar verification API
      // For now, we'll simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate fetching user details from Aadhaar
      const mockAadhaarData = {
        name: 'John Doe',
        language: 'hi',
      };

      form.setValue('name', mockAadhaarData.name);
      form.setValue('preferredLanguage', mockAadhaarData.language);

      toast({
        title: 'Aadhaar verified',
        description: 'Your identity has been verified successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: 'Could not verify Aadhaar number. Please try again.',
      });
    } finally {
      setIsVerifyingAadhaar(false);
    }
  };

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterForm) => {
      const response = await authAPI.register(data);
      return response.data;
    },
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      toast({
        title: 'Registration successful',
        description: 'Your account has been created successfully.',
      });
      navigate('/');
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description:
          error.response?.data?.message ||
          'Could not create your account. Please try again.',
      });
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      await registerMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your details to get started
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="aadhaarNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aadhaar Number</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        placeholder="Enter your 12-digit Aadhaar number"
                        disabled={isLoading || isVerifyingAadhaar}
                        {...field}
                      />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => verifyAadhaar(field.value)}
                      disabled={
                        !isValidAadhaar(field.value) ||
                        isLoading ||
                        isVerifyingAadhaar
                      }
                    >
                      {isVerifyingAadhaar ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your full name"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your email"
                      type="email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Create a password"
                      type="password"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter your phone number"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="preferredLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred Language</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your preferred language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || isVerifyingAadhaar}
            >
              {isLoading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() => navigate('/login')}
          >
            Already have an account? Sign in
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage; 