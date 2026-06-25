import React, { useState } from 'react';
import { FileAttachment } from '../../background/types';
import { faFilePdf, faFileLines, faImage, faXmark } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { formatFileSize } from '../utils/fileUtils';

interface AttachmentPreviewProps {
  attachments: FileAttachment[];
  removable?: boolean;
  onRemove?: (id: string) => void;
  compact?: boolean;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({
  attachments,
  removable = false,
  onRemove,
  compact = false,
}) => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!attachments || attachments.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'image': return faImage;
      case 'pdf': return faFilePdf;
      default: return faFileLines;
    }
  };

  const handleImageClick = (data: string, mimeType: string) => {
    setExpandedImage(`data:${mimeType};base64,${data}`);
  };

  return (
    <>
      <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-1' : 'mt-2'}`}>
        {attachments.map(att => (
          <div key={att.id} className="relative group">
            {att.type === 'image' ? (
              <div
                className={`rounded overflow-hidden cursor-pointer ${compact ? 'w-12 h-12' : 'w-16 h-16'} border border-base-content border-opacity-10`}
                onClick={() => handleImageClick(att.data, att.mimeType)}
                title={att.name}
              >
                <img
                  src={`data:${att.mimeType};base64,${att.data}`}
                  alt={att.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className={`flex items-center gap-1 bg-base-200 rounded px-1.5 py-1 ${compact ? 'text-[10px]' : 'text-xs'}`}>
                <FontAwesomeIcon icon={getIcon(att.type)} className="opacity-60 flex-shrink-0" />
                <span className="truncate max-w-[100px]">{att.name}</span>
                {!compact && <span className="opacity-50">{formatFileSize(att.size)}</span>}
              </div>
            )}
            {removable && onRemove && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onRemove(att.id); }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-error text-error-content rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FontAwesomeIcon icon={faXmark} style={{ fontSize: '8px' }} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Image lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center cursor-pointer"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-red-400 transition-colors"
            onClick={() => setExpandedImage(null)}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>
      )}
    </>
  );
};
