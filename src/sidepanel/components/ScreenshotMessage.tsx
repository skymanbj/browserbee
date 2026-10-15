import React from 'react';

interface ScreenshotMessageProps {
  imageData: string;
  mediaType?: string;
}

export const ScreenshotMessage: React.FC<ScreenshotMessageProps> = ({ 
  imageData, 
  mediaType = 'image/jpeg' 
}) => {
  return (
    <div className="my-2">
      <div className="text-sm text-base-content/60 mb-1">Screenshot captured:</div>
      <img 
        src={`data:${mediaType};base64,${imageData}`}
        alt="Screenshot"
        className="max-w-full rounded shadow-md"
        style={{ maxHeight: '400px' }}
      />
    </div>
  );
};
