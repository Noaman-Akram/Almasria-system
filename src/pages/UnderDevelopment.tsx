import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Construction, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';

const UnderDevelopment: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="flex justify-center">
          <Construction className="h-24 w-24 text-yellow-500" />
        </div>
        
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Under Development
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            This feature is currently being developed. Please check back later.
          </p>
        </div>

        <div className="mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="inline-flex items-center"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
};

export default UnderDevelopment; 