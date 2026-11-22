
'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function Home() {
  const [user, setUser] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [content, setContent] = useState('')
  const [files, setFiles] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadPosts() {
    const { data, error } = await supabase
      .from('Posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(error.message)
      return
    }

    setPosts(data || [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
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

      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${user.id}/${Date.now()}-${safeName}`

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
      await loadPosts()
      setMessage('Published successfully ❤️')
    } catch (error) {
      setMessage(error.message)
    }

    setLoading(false)
  }

  function getImages(value) {
    try {
      return JSON.parse(value || '[]')
    } catch {
      return []
    }
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f7f4ef',
      color: '#292722',
      padding: '55px 20px',
      fontFamily: 'Georgia, serif'
    }}>
      <div style={{ maxWidth: 650, margin: 'auto' }}>

        <p style={{
          fontSize: 11,
          letterSpacing: 4,
          color: '#999'
        }}>
          A PERSONAL DIARY
        </p>

        <h1 style={{
          fontSize: 43,
          fontWeight: 'normal',
          margin: '18px 0 8px'
        }}>
          lilwff’s story
        </h1>

        <p style={{ color: '#888', marginBottom: 40 }}>
          Little pieces of a life, collected in one place.
        </p>

        {user ? (
          <form onSubmit={publish} style={{
            border: '1px solid #e3ded5',
            padding: 20,
            borderRadius: 8,
            marginBottom: 35
          }}>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="What's on your mind?"
              style={{
                width: '100%',
                minHeight: 110,
                resize: 'vertical',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                font: '17px Georgia',
                color: '#292722'
              }}
            />

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={e => setFiles(Array.from(e.target.files || []))}
              style={{ margin: '15px 0', maxWidth: '100%' }}
            />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: 12, color: '#999' }}>
                {files.length ? `${files.length} images selected` : 'Your diary'}
              </span>

              <button disabled={loading} style={{
                background: '#292722',
                color: 'white',
                border: 'none',
                padding: '11px 25px',
                borderRadius: 30,
                cursor: 'pointer'
              }}>
                {loading ? 'Publishing...' : 'Publish'}
              </button>
            </div>

            <button type="button" onClick={logout} style={{
              border: 'none',
              background: 'transparent',
              color: '#999',
              marginTop: 15,
              cursor: 'pointer'
            }}>
              Log out
            </button>
          </form>
        ) : (
          <details style={{ marginBottom: 35 }}>
            <summary style={{
              cursor: 'pointer',
              color: '#888',
              fontSize: 13
            }}>
              Admin login
            </summary>

            <form onSubmit={login} style={{
              padding: 18,
              border: '1px solid #e3ded5',
              borderRadius: 8,
              marginTop: 15
            }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 12,
                  marginBottom: 12,
                  boxSizing: 'border-box'
                }}
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  display: 'block',
                  width: '100%',
                  padding: 12,
                  marginBottom: 12,
                  boxSizing: 'border-box'
                }}
              />

              <button style={{
                padding: '10px 22px',
                background: '#292722',
                color: 'white',
                border: 'none',
                borderRadius: 25
              }}>
                Login
              </button>
            </form>
          </details>
        )}

        {message && (
          <p style={{
            color: '#888',
            fontSize: 13,
            marginBottom: 20,
            overflowWrap: 'anywhere'
          }}>
            {message}
          </p>
        )}

        <hr style={{
          border: 'none',
          borderTop: '1px solid #ddd',
          margin: '30px 0'
        }} />

        {posts.length === 0 ? (
          <p style={{
            color: '#aaa',
            textAlign: 'center',
            padding: '60px 0'
          }}>
            The story begins here.
          </p>
        ) : (
          posts.map(post => (
            <article key={post.id} style={{
              padding: '25px 0',
              borderBottom: '1px solid #e3ded5'
            }}>
              <p style={{
                whiteSpace: 'pre-wrap',
                fontSize: 17,
                lineHeight: 1.8,
                margin: '0 0 18px'
              }}>
                {post.content}
              </p>

              {getImages(post.images).map((url, index) => (
                <img
                  key={index}
                  src={url}
                  alt="Diary photo"
                  style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: 500,
                    objectFit: 'cover',
                    borderRadius: 5,
                    marginBottom: 10
                  }}
                />
              ))}

              <p style={{
                color: '#aaa',
                fontSize: 11,
                marginTop: 15
              }}>
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </article>
          ))
        )}

      </div>
    </main>
  )
}
