import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Toast from '../../components/ui/Toast';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [toast, setToast] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  useEffect(() => {
    const verifyEmailToken = async () => {
      const oobCode = searchParams.get('oobCode');
      if (!oobCode) {
        setToast({
          type: 'error',
          message: 'Invalid or expired verification link.'
        });
        setLoading(false);
        return;
      }

      try {
        await verifyEmail(oobCode);
        setVerified(true);
        setToast({
          type: 'success',
          message: 'Email verified successfully!'
        });
        setTimeout(() => navigate('/auth/login'), 2000);
      } catch (error) {
        console.error('Email verification error:', error);
        setToast({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to verify email. Please try again.'
        });
      } finally {
        setLoading(false);
      }
    };

    verifyEmailToken();
  }, [searchParams, verifyEmail, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {loading ? (
              <>
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  Verifying your email...
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Please wait while we verify your email address.
                </p>
              </>
            ) : verified ? (
              <>
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  Email verified!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Your email has been successfully verified. You can now sign in to your account.
                </p>
              </>
            ) : (
              <>
                <XCircle className="mx-auto h-12 w-12 text-red-600" />
                <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                  Verification failed
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  We couldn't verify your email address. Please try again or contact support.
                </p>
              </>
            )}

            <div className="mt-6">
              <Button
                type="button"
                className="w-full"
                onClick={() => navigate('/auth/login')}
              >
                Back to sign in
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail; 