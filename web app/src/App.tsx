import { useState, useRef, useEffect } from 'react'
import { ProcessedSprite, PackingResult } from './lib/types'
import { DropZone } from './components/DropZone'
import { applyColorKeying } from './lib/ImageProcessor'
import { packSprites } from './lib/PackerEngine'
import { Trash2, Download, Settings, Layers } from 'lucide-react'

function App() {
  const [sprites, setSprites] = useState<ProcessedSprite[]>([])
  const [baseRes, setBaseRes] = useState(32)
  const [padding, setPadding] = useState(0)
  const [colorKey, setColorKey] = useState(false)
  const [forcePot, setForcePot] = useState(false)
  const [packageName, setPackageName] = useState('MySpriteAtlas')
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Canvas for generation
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleLoaded = (newSprites: ProcessedSprite[]) => {
    setSprites(prev => [...prev, ...newSprites])
  }

  const removeSprite = (id: string) => {
    setSprites(prev => prev.filter(s => s.id !== id))
  }

  const updateGridSpan = (id: string, field: 'gridW' | 'gridH', val: number) => {
    setSprites(prev => prev.map(s => s.id === id ? { ...s, [field]: Math.max(1, val) } : s))
  }

  const generateAtlas = async () => {
    if (sprites.length === 0) return
    setIsProcessing(true)

    try {
      // 1. Pre-process (Color Keying)
      const processed = await Promise.all(sprites.map(async (s) => {
        if (colorKey) {
            // Re-process bitmap if keying is needed
            // optimization: cache this? for now, just do it.
            const keyed = await applyColorKeying(s.bitmap)
            return { ...s, bitmap: keyed }
        }
        return s
      }))

      // 2. Pack
      const result = packSprites(processed, {
        baseRes,
        padding,
        forcePowerOfTwo: forcePot
      })

      // 3. Draw to Canvas
      const canvas = canvasRef.current
      if (!canvas) return
      
      canvas.width = result.width
      canvas.height = result.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.imageSmoothingEnabled = false // Nearest Neighbor

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw items
      result.items.forEach(item => {
        // Destination size (the target grid size)
        ctx.drawImage(
            item.sprite.bitmap, 
            0, 0, item.sprite.originalWidth, item.sprite.originalHeight, // Source
            item.x, item.y, item.w - padding, item.h - padding // Dest (minus padding for drawing, padding is space between)
        )
      })

      // 4. Download
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${packageName}.png`
        a.click()
        URL.revokeObjectURL(url)

        // JSON Metadata
        const meta = {
            name: packageName,
            size: { w: result.width, h: result.height },
            frames: result.items.reduce((acc, item) => {
                acc[item.sprite.name] = {
                    x: item.x,
                    y: item.y,
                    w: item.w - padding,
                    h: item.h - padding
                }
                return acc
            }, {} as Record<string, any>)
        }
        const metaBlob = new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' })
        const metaUrl = URL.createObjectURL(metaBlob)
        const metaA = document.createElement('a')
        metaA.href = metaUrl
        metaA.download = `${packageName}.json`
        metaA.click()
        URL.revokeObjectURL(metaUrl)
      }

    } catch (e) {
      console.error(e)
      alert("Error generating atlas")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '30px', borderBottom: '1px solid #333', paddingBottom: '20px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: '#646cff' }}>Pixel Architect <span style={{fontSize: '1rem', color:'#666'}}>SaaS Edition</span></h1>
        <p style={{ margin: '5px 0 0 0', color: '#888' }}>Client-Side Sprite Sheet Packer</p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '30px' }}>
        {/* Sidebar Controls */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card" style={{ background: '#1e1e1e', borderRadius: '8px', padding: '20px' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0 }}>
                    <Settings size={18} /> Settings
                </h3>
                
                <label style={{display: 'block', marginBottom: '10px'}}>
                    <span style={{display:'block', fontSize: '0.9em', color:'#aaa', marginBottom:'5px'}}>Package Name</span>
                    <input style={{width: '100%'}} value={packageName} onChange={e => setPackageName(e.target.value)} />
                </label>

                <label style={{display: 'block', marginBottom: '10px'}}>
                    <span style={{display:'block', fontSize: '0.9em', color:'#aaa', marginBottom:'5px'}}>Base Grid (px)</span>
                    <select style={{width: '100%'}} value={baseRes} onChange={e => setBaseRes(Number(e.target.value))}>
                        {[16, 32, 48, 64, 128].map(r => <option key={r} value={r}>{r}x{r}</option>)}
                    </select>
                </label>

                <label style={{display: 'block', marginBottom: '10px'}}>
                    <span style={{display:'block', fontSize: '0.9em', color:'#aaa', marginBottom:'5px'}}>Padding (px)</span>
                    <input type="number" style={{width: '100%'}} value={padding} onChange={e => setPadding(Number(e.target.value))} />
                </label>

                <div style={{borderTop: '1px solid #333', margin: '15px 0'}}></div>

                <label style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor:'pointer'}}>
                    <input type="checkbox" checked={colorKey} onChange={e => setColorKey(e.target.checked)} />
                    <span style={{fontSize: '0.9em'}}>Color Keying (White -> Transparent)</span>
                </label>

                <label style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', cursor:'pointer'}}>
                    <input type="checkbox" checked={forcePot} onChange={e => setForcePot(e.target.checked)} />
                    <span style={{fontSize: '0.9em'}}>Force Power of Two</span>
                </label>

                <button 
                    onClick={generateAtlas} 
                    disabled={sprites.length === 0 || isProcessing}
                    style={{ 
                        width: '100%', 
                        marginTop: '20px',
                        background: isProcessing ? '#444' : '#646cff',
                        color: 'white',
                        fontWeight: 'bold',
                        display: 'flex',
                        justifyContent: 'center',
                        gap: '10px',
                        alignItems: 'center'
                    }}
                >
                    {isProcessing ? 'Processing...' : <><Download size={18} /> Generate Atlas</>}
                </button>
            </div>
            
            <div style={{background: '#111', padding: '15px', borderRadius: '8px', fontSize: '0.8em', color: '#555'}}>
                <h4 style={{margin: '0 0 10px 0', color: '#777'}}>Stats</h4>
                <div>Sprites: {sprites.length}</div>
            </div>
        </aside>

        {/* Main Content */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <DropZone onSpritesLoaded={handleLoaded} />

            <div style={{ background: '#1e1e1e', borderRadius: '12px', overflow: 'hidden', minHeight: '400px' }}>
                <div style={{ padding: '15px 20px', borderBottom: '1px solid #333', background: '#252525', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={18} color="#aaa" />
                    <span style={{fontWeight: 500}}>Sprite Queue</span>
                </div>
                
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {sprites.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#444' }}>
                            Queue is empty. Drop some files above.
                        </div>
                    )}
                    {sprites.map(sprite => (
                        <div key={sprite.id} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            background: '#2a2a2a', 
                            padding: '10px', 
                            borderRadius: '6px',
                            gap: '15px'
                        }}>
                            <div style={{ 
                                width: '48px', height: '48px', 
                                background: `url(${URL.createObjectURL(sprite.file)}) no-repeat center/contain`,
                                imageRendering: 'pixelated'
                            }} />
                            
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sprite.name}</div>
                                <div style={{ fontSize: '0.8em', color: '#888' }}>{sprite.originalWidth}x{sprite.originalHeight}px</div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '0.8em', color: '#aaa' }}>Grid Span:</span>
                                <input 
                                    type="number" min="1" max="64" 
                                    value={sprite.gridW} 
                                    onChange={e => updateGridSpan(sprite.id, 'gridW', Number(e.target.value))}
                                    style={{ width: '50px' }} 
                                />
                                <span style={{color: '#666'}}>x</span>
                                <input 
                                    type="number" min="1" max="64" 
                                    value={sprite.gridH} 
                                    onChange={e => updateGridSpan(sprite.id, 'gridH', Number(e.target.value))}
                                    style={{ width: '50px' }} 
                                />
                            </div>

                            <button 
                                onClick={() => removeSprite(sprite.id)}
                                style={{ background: 'transparent', color: '#ff5555', padding: '8px' }}
                                title="Remove"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </main>
      </div>

      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default App
