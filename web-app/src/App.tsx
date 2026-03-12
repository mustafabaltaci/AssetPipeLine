import { useState, useRef } from 'react'
import { ProcessedSprite, PackingItem } from './lib/types'
import { DropZone } from './components/DropZone'
import { applyColorKeying } from './lib/ImageProcessor'
import { packSprites } from './lib/PackerEngine'
import { Trash2, Settings } from 'lucide-react'

function App() {
  const [sprites, setSprites] = useState<ProcessedSprite[]>([])
  const [baseRes, setBaseRes] = useState(32)
  const [packageName, setPackageName] = useState('MySpriteAtlas')
  const [isProcessing, setIsProcessing] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleLoaded = (newSprites: ProcessedSprite[]) => setSprites(prev => [...prev, ...newSprites])
  const removeSprite = (id: string) => setSprites(prev => prev.filter(s => s.id !== id))
  const updateGridSpan = (id: string, field: 'gridW' | 'gridH', val: number) => {
    setSprites(prev => prev.map(s => s.id === id ? { ...s, [field]: Math.max(1, val) } : s))
  }

  const generateAtlas = async () => {
    if (sprites.length === 0) return
    setIsProcessing(true)
    try {
      const processed = await Promise.all(sprites.map(async (s) => {
        // Force keying based on UI (always keying white for simplicity in this version)
        const keyed = await applyColorKeying(s.bitmap)
        return { ...s, bitmap: keyed }
      }))
      const result = packSprites(processed, { baseRes, padding: 0, forcePowerOfTwo: false })
      const canvas = canvasRef.current
      if (!canvas) return
      canvas.width = result.width; canvas.height = result.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.imageSmoothingEnabled = false
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      result.items.forEach((item: PackingItem) => {
        ctx.drawImage(item.sprite.bitmap, 0, 0, item.sprite.originalWidth, item.sprite.originalHeight, item.x, item.y, item.w, item.h)
      })
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = `${packageName}.png`; a.click()
        URL.revokeObjectURL(url)
        const meta = { name: packageName, size: { w: result.width, h: result.height }, frames: result.items.reduce((acc: Record<string, any>, item: PackingItem) => {
                acc[item.sprite.name] = { x: item.x, y: item.y, w: item.w, h: item.h }
                return acc
            }, {} as Record<string, any>) }
        const metaBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' })
        const metaUrl = URL.createObjectURL(metaBlob)
        const metaA = document.createElement('a'); metaA.href = metaUrl; metaA.download = `${packageName}.json`; metaA.click()
        URL.revokeObjectURL(metaUrl)
      }
    } catch (e) { console.error(e); alert("Error generating atlas")
    } finally { setIsProcessing(false) }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#646cff' }}>Pixel Architect <span style={{fontSize: '1rem', color:'#666'}}>SaaS Edition</span></h1>
      </header>
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px' }}>
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#1e1e1e', borderRadius: '8px', padding: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}><Settings size={18} /> Settings</h3>
                <label style={{display: 'block', marginBottom: '10px'}}><span style={{display:'block', fontSize: '0.9em', color:'#aaa'}}>Package Name</span>
                    <input style={{width: '100%'}} value={packageName} onChange={e => setPackageName(e.target.value)} /></label>
                <label style={{display: 'block', marginBottom: '10px'}}><span style={{display:'block', fontSize: '0.9em', color:'#aaa'}}>Base Grid</span>
                    <select style={{width: '100%'}} value={baseRes} onChange={e => setBaseRes(Number(e.target.value))}>
                        {[16, 32, 48, 64, 128].map(r => <option key={r} value={r}>{r}x{r}</option>)}
                    </select></label>
                <button onClick={generateAtlas} disabled={sprites.length === 0 || isProcessing} style={{ width: '100%', marginTop: '20px', background: '#646cff', color: 'white', fontWeight: 'bold' }}>
                    {isProcessing ? 'Processing...' : 'Generate Atlas'}</button>
            </div>
        </aside>
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <DropZone onSpritesLoaded={handleLoaded} />
            <div style={{ background: '#1e1e1e', borderRadius: '12px', minHeight: '400px' }}>
                {sprites.map(sprite => (
                    <div key={sprite.id} style={{ display: 'flex', alignItems: 'center', background: '#2a2a2a', padding: '10px', margin: '10px', borderRadius: '6px', gap: '15px' }}>
                        <div style={{ flex: 1 }}>{sprite.name}</div>
                        <input type="number" min="1" value={sprite.gridW} onChange={e => updateGridSpan(sprite.id, 'gridW', Number(e.target.value))} style={{ width: '50px' }} />
                        <button onClick={() => removeSprite(sprite.id)} style={{ color: '#ff5555' }}><Trash2 size={18} /></button>
                    </div>))}
            </div>
        </main>
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}
export default App
