
'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const OWNER_ID = 'ff441acd-0b7b-4a8f-a521-2f2e4366ddd3'

function getImages(value) {
  try {
    return Array.isArray(value) ? value : JSON.parse(value || '[]')
  } catch {
    return []
  }
}

export default function Home() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [posts, setPosts] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedImages, setSelectedImages] = useState(null)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const isOwner = user?.id === OWNER_ID

  async function loadPosts() {
    const { data, error } = await supabase
      .from('Posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setPosts(data || [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user || null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
      }
    )

    loadPosts()

    return () => listener.subscription.unsubscribe()
  }, [])

  async function login(e) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) setMessage(error.message)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  async function publish(e) {
    e.preventDefault()
    if (!content.trim() && files.length === 0) return

    setLoading(true)
    setMessage('')

    try {
      const imageUrls = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-')
        const path = `${user.id}/${Date.now()}-${i}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(path, file)

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('post-images')
          .getPublicUrl(path)

        imageUrls.push(data.publicUrl)
      }

      const { error } = await supabase
        .from('Posts')
        .insert({
          content: content.trim(),
          images: JSON.stringify(imageUrls)
        })

      if (error) throw error

      setContent('')
      setFiles([])
      e.target.reset()
      setMessage('Published!')
      await loadPosts()
    } catch (error) {
      setMessage(error.message || 'Something went wrong')
    }

    setLoading(false)
  }

  function openGallery(images, index) {
    setSelectedImages(images)
    setSelectedIndex(index)
  }

  function closeGallery() {
    setSelectedImages(null)
  }

  function changeImage(direction) {
    setSelectedIndex(current =>
      (current + direction + selectedImages.length) % selectedImages.length
    )
  }

  function renderImages(images) {
    if (!images.length) return null

    const count = images.length

    const gridStyle = {
      display: 'grid',
      gridTemplateColumns: count === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
      gridTemplateRows: count === 3 ? 'repeat(2, 1fr)' : 'auto',
      gap: '5px',
      overflow: 'hidden',
      borderRadius: '13px',
      marginTop: '13px'
    }

    return (
      <div style={gridStyle}>
        {images.slice(0, 4).map((url, index) => {
          const isSingle = count === 1
          const isThreeMain = count === 3 && index === 0

          return (
            <div
              key={index}
              onClick={() => openGallery(images, index)}
              style={{
                position: 'relative',
                overflow: 'hidden',
                background: '#e9e5df',
                cursor: 'pointer',
                gridRow: isThreeMain ? 'span 2' : 'auto',
                aspectRatio: isSingle ? 'auto' : isThreeMain ? '1 / 2' : '1 / 1',
                minHeight: isSingle ? 0 : undefined
              }}
            >
              <img
                src={url}
                alt="Diary photo"
                loading="lazy"
                style={{
                  display: 'block',
                  width: '100%',
                  height: isSingle ? 'auto' : '100%',
                  maxHeight: isSingle ? '650px' : 'none',
                  objectFit: isSingle ? 'contain' : 'cover'
                }}
              />
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f7f4ee',
      color: '#29251f',
      fontFamily: 'Georgia, serif',
      padding: '35px 18px'
    }}>
      <div style={{ maxWidth: '620px', margin: '0 auto' }}>

        <header style={{
          textAlign: 'center',
          padding: '20px 0 35px',
          borderBottom: '1px solid #e5dfd5'
        }}>
          <div style={{
            fontSize: '10px',
            letterSpacing: '4px',
            color: '#9b8d7a',
            marginBottom: '15px'
          }}>
            A PERSONAL DIARY
          </div>

          <h1 style={{
            fontSize: '38px',
            fontWeight: 'normal',
            margin: 0,
            letterSpacing: '-1px'
          }}>
            lilwff’s story
          </h1>
        </header>

        {!user ? (
          <details style={{ margin: '25px 0', textAlign: 'center' }}>
            <summary style={{
              cursor: 'pointer',
              color: '#9b8d7a',
              fontSize: '13px'
            }}>
              Admin login
            </summary>

            <form onSubmit={login} style={{
              display: 'grid',
              gap: '10px',
              maxWidth: '320px',
              margin: '20px auto'
            }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
              />

              <button style={buttonStyle}>Login</button>
              {message && <p>{message}</p>}
            </form>
          </details>
        ) : isOwner ? (
          <section style={{
            padding: '22px 0',
            borderBottom: '1px solid #e5dfd5'
          }}>
            <form onSubmit={publish}>
              <textarea
                placeholder="Write something..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                style={{
                  ...inputStyle,
                  width: '100%',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'Georgia, serif',
                  fontSize: '16px'
                }}
              />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '10px',
                marginTop: '12px',
                flexWrap: 'wrap'
              }}>
                <label style={{
                  cursor: 'pointer',
                  color: '#887965',
                  fontSize: '13px'
                }}>
                  + Add photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={e => setFiles(Array.from(e.target.files || []))}
                    style={{ display: 'none' }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  style={buttonStyle}
                >
                  {loading ? 'Publishing...' : 'Publish'}
                </button>
              </div>

              {files.length > 0 && (
                <p style={{ fontSize: '12px', color: '#887965' }}>
                  {files.length} photo(s) selected
                </p>
              )}

              {message && (
                <p style={{ fontSize: '13px', color: '#887965' }}>
                  {message}
                </p>
              )}
            </form>

            <div style={{ textAlign: 'right', marginTop: '12px' }}>
              <button onClick={logout} style={smallButtonStyle}>
                Log out
              </button>
            </div>
          </section>
        ) : (
          <div style={{ textAlign: 'right', padding: '15px 0' }}>
            <button onClick={logout} style={smallButtonStyle}>
              Log out
            </button>
          </div>
        )}

        <section>
          {posts.map(post => {
            const images = getImages(post.images)

            return (
              <article key={post.id} style={{
                padding: '25px 0',
                borderBottom: '1px solid #e5dfd5'
              }}>
                {post.content && (
                  <p style={{
                    fontSize: '16px',
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                    margin: 0
                  }}>
                    {post.content}
                  </p>
                )}

                {renderImages(images)}

                <div style={{
                  fontSize: '11px',
                  color: '#a39787',
                  marginTop: '14px',
                  letterSpacing: '0.5px'
                }}>
                  {new Date(post.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </article>
            )
          })}
        </section>
      </div>

      {selectedImages && (
        <div
          onClick={closeGallery}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.94)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <button
            onClick={closeGallery}
            style={{
              position: 'absolute',
              top: '20px',
              right: '22px',
              color: 'white',
              background: 'transparent',
              border: 0,
              fontSize: '30px',
              cursor: 'pointer'
            }}
          >
            ×
          </button>

          {selectedImages.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation()
                changeImage(-1)
              }}
              style={galleryArrowStyle}
            >
              ‹
            </button>
          )}

          <img
            src={selectedImages[selectedIndex]}
            alt="Expanded diary photo"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '85vh',
              objectFit: 'contain'
            }}
          />

          {selectedImages.length > 1 && (
            <button
              onClick={e => {
                e.stopPropagation()
                changeImage(1)
              }}
              style={galleryArrowStyle}
            >
              ›
            </button>
          )}

          <div style={{
            position: 'absolute',
            bottom: '20px',
            color: 'white',
            fontSize: '13px'
          }}>
            {selectedIndex + 1} / {selectedImages.length}
          </div>
        </div>
      )}
    </main>
  )
}

const inputStyle = {
  padding: '13px',
  border: '1px solid #e5dfd5',
  borderRadius: '8px',
  background: '#fbfaf7',
  color: '#29251f',
  outline: 'none'
}

const buttonStyle = {
  padding: '11px 22px',
  border: 'none',
  borderRadius: '25px',
  background: '#29251f',
  color: '#fff',
  cursor: 'pointer',
  fontFamily: 'Georgia, serif'
}

const smallButtonStyle = {
  border: 'none',
  background: 'transparent',
  color: '#9b8d7a',
  cursor: 'pointer',
  fontFamily: 'Georgia, serif',
  fontSize: '12px'
}

const galleryArrowStyle = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  borderRadius: '50%',
  color: 'white',
  fontSize: '35px',
  width: '45px',
  height: '45px',
  cursor: 'pointer',
  margin: '0 10px'
}
