import { useCallback } from 'react';
import { loadSprite } from '../lib/ImageProcessor.ts';
import { ProcessedSprite } from '../lib/types.ts';
import { Upload } from 'lucide-react';

interface DropZoneProps {
    onSpritesLoaded: (sprites: ProcessedSprite[]) => void;
}

export function DropZone({ onSpritesLoaded }: DropZoneProps) {
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
        if (files.length === 0) return;
        const loaded = await Promise.all(files.map(loadSprite));
        onSpritesLoaded(loaded);
    }, [onSpritesLoaded]);

    return (
        <div 
            onDragOver={(e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={handleDrop}
            style={{
                border: '2px dashed #444', borderRadius: '12px', padding: '40px',
                textAlign: 'center', backgroundColor: '#1a1a1a', cursor: 'pointer'
            }}
        >
            <Upload size={48} color="#646cff" style={{ margin: '0 auto 10px' }} />
            <h3>Drag & Drop Sprites Here</h3>
            <p style={{ color: '#888' }}>Supports PNG, JPG, WEBP</p>
        </div>
    );
}
