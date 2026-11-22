
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

function getStoragePath(url) {
  const marker = '/storage/v1/object/public/post-images/'
  return url.includes(marker) ? decodeURIComponent(url.split(marker)[1]) : null
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

  const [editingPost, setEditingPost] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [editImages, setEditImages] = useState([])
  const [editFiles, setEditFiles] = useState([])

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
      (_event, session) => setUser(session?.user || null)
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

  async function uploadFiles(selectedFiles) {
    const urls = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '-')
      const path = `${user.id}/${Date.now()}-${i}-${safeName}`

      const { error } = await supabase.storage
        .from('post-images')
        .upload(path, file)

      if (error) throw error

      const { data } = supabase.storage
        .from('post-images')
        .getPublicUrl(path)

      urls.push(data.publicUrl)
    }

    return urls
  }

  async function removeStoredImages(urls) {
    const paths = urls.map(getStoragePath).filter(Boolean)
    if (paths.length) {
      await supabase.storage.from('post-images').remove(paths)
    }
  }

  async function publish(e) {
    e.preventDefault()
    if (!content.trim() && files.length === 0) return

    setLoading(true)
    setMessage('')

    try {
      const imageUrls = await uploadFiles(files)

      const { error } = await supabase.from('Posts').insert({
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

  function startEditing(post) {
    setEditingPost(post)
    setEditContent(post.content || '')
    setEditImages(getImages(post.images))
    setEditFiles([])
    setMessage('')
  }

  function cancelEditing() {
    setEditingPost(null)
    setEditContent('')
    setEditImages([])
    setEditFiles([])
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editingPost) return

    setLoading(true)
    setMessage('')

    try {
      const newUrls = await uploadFiles(editFiles)
      const finalImages = [...editImages, ...newUrls]

      const { error } = await supabase
        .from('Posts')
        .update({
          content: editContent.trim(),
          images: JSON.stringify(finalImages)
        })
        .eq('id', editingPost.id)

      if (error) throw error

      const oldImages = getImages(editingPost.images)
      const removedImages = oldImages.filter(url => !editImages.includes(url))

      await removeStoredImages(removedImages)

      cancelEditing()
      await loadPosts()
    } catch (error) {
      setMessage(error.message || 'Something went wrong')
    }

    setLoading(false)
  }

  async function deletePost(post) {
    const confirmed = window.confirm('Are you sure you want to delete this diary entry?')
    if (!confirmed) return

    setLoading(true)
    setMessage('')

    const { error } = await supabase
      .from('Posts')
      .delete()
      .eq('id', post.id)

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    await removeStoredImages(getImages(post.images))
    if (editingPost?.id === post.id) cancelEditing()
    await loadPosts()
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

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: count === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
        gridTemplateRows: count === 3 ? 'repeat(2, 1fr)' : 'auto',
        gap: 5,
        overflow: 'hidden',
        borderRadius: 13,
        marginTop: 13
      }}>
        {images.slice(0, 4).map((url, index) => {
          const single = count === 1
          const main = count === 3 && index === 0

          return (
            <div
              key={index}
              onClick={() => openGallery(images, index)}
              style={{
                overflow: 'hidden',
                background: '#e9e5df',
                cursor: 'pointer',
                gridRow: main ? 'span 2' : 'auto',
                aspectRatio: single ? 'auto' : main ? '1 / 2' : '1 / 1'
              }}
            >
              <img
                src={url}
                alt="Diary photo"
                loading="lazy"
                style={{
                  display: 'block',
                  width: '100%',
                  height: single ? 'auto' : '100%',
                  maxHeight: single ? 650 : 'none',
                  objectFit: single ? 'contain' : 'cover'
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
      <div style={{ maxWidth: 620, margin: '0 auto' }}>

        <header style={{
          textAlign: 'center',
          padding: '20px 0 35px',
          borderBottom: '1px solid #e5dfd5'
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: 4,
            color: '#9b8d7a',
            marginBottom: 15
          }}>
            A PERSONAL DIARY
          </div>

          <h1 style={{
            fontSize: 38,
            fontWeight: 'normal',
            margin: 0,
            letterSpacing: -1
          }}>
            lilwff’s story
          </h1>
        </header>

        {!user ? (
          <details style={{ margin: '25px 0', textAlign: 'center' }}>
            <summary style={{
              cursor: 'pointer',
              color: '#9b8d7a',
              fontSize: 13
            }}>
              Admin login
            </summary>

            <form onSubmit={login} style={{
              display: 'grid',
              gap: 10,
              maxWidth: 320,
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
                  fontSize: 16
                }}
              />

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                marginTop: 12,
                flexWrap: 'wrap'
              }}>
                <label style={{
                  cursor: 'pointer',
                  color: '#887965',
                  fontSize: 13
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

                <button type="submit" disabled={loading} style={buttonStyle}>
                  {loading ? 'Publishing...' : 'Publish'}
                </button>
              </div>

              {files.length > 0 && (
                <p style={{ fontSize: 12, color: '#887965' }}>
                  {files.length} photo(s) selected
                </p>
              )}

              {message && (
                <p style={{ fontSize: 13, color: '#887965' }}>{message}</p>
              )}
            </form>

            <div style={{ textAlign: 'right', marginTop: 12 }}>
              <button onClick={logout} style={smallButtonStyle}>
                Log out
              </button>
            </div>
          </section>
        ) : (
          <div style={{ textAlign: 'right', padding: '15px 0' }}>
            <button onClick={logout} style={smallButtonStyle}>Log out</button>
          </div>
        )}

        <section>
          {posts.map(post => {
            const images = getImages(post.images)
            const isEditing = editingPost?.id === post.id

            return (
              <article key={post.id} style={{
                padding: '25px 0',
                borderBottom: '1px solid #e5dfd5'
              }}>
                {isEditing ? (
                  <form onSubmit={saveEdit}>
                    <textarea
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      rows={5}
                      placeholder="Write something..."
                      style={{
                        ...inputStyle,
                        width: '100%',
                        boxSizing: 'border-box',
                        resize: 'vertical',
                        fontFamily: 'Georgia, serif',
                        fontSize: 16
                      }}
                    />

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                      gap: 8,
                      marginTop: 12
                    }}>
                      {editImages.map((url, index) => (
                        <div key={url} style={{ position: 'relative' }}>
                          <img
                            src={url}
                            alt="Existing photo"
                            style={{
                              width: '100%',
                              aspectRatio: '1 / 1',
                              objectFit: 'cover',
                              borderRadius: 9
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setEditImages(old =>
                              old.filter((_, i) => i !== index)
                            )}
                            style={removeButtonStyle}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <label style={{
                      display: 'inline-block',
                      marginTop: 14,
                      color: '#887965',
                      fontSize: 13,
                      cursor: 'pointer'
                    }}>
                      + Add more photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={e => setEditFiles(Array.from(e.target.files || []))}
                        style={{ display: 'none' }}
                      />
                    </label>

                    {editFiles.length > 0 && (
                      <p style={{ fontSize: 12, color: '#887965' }}>
                        {editFiles.length} new photo(s) selected
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      gap: 10,
                      marginTop: 15
                    }}>
                      <button type="submit" disabled={loading} style={buttonStyle}>
                        {loading ? 'Saving...' : 'Save changes'}
                      </button>

                      <button
                        type="button"
                        onClick={cancelEditing}
                        style={smallButtonStyle}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <>
                    {post.content && (
                      <p style={{
                        fontSize: 16,
                        lineHeight: 1.8,
                        whiteSpace: 'pre-wrap',
                        margin: 0
                      }}>
                        {post.content}
                      </p>
                    )}

                    {renderImages(images)}

                    <div style={{
                      fontSize: 11,
                      color: '#a39787',
                      marginTop: 14,
                      letterSpacing: 0.5
                    }}>
                      {new Date(post.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>

                    {isOwner && (
                      <div style={{
                        display: 'flex',
                        gap: 18,
                        marginTop: 12
                      }}>
                        <button
                          onClick={() => startEditing(post)}
                          style={smallButtonStyle}
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deletePost(post)}
                          disabled={loading}
                          style={{
                            ...smallButtonStyle,
                            color: '#a45c52'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </>
                )}
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
            padding: 20
          }}
        >
          <button
            onClick={closeGallery}
            style={{
              position: 'absolute',
              top: 20,
              right: 22,
              color: 'white',
              background: 'transparent',
              border: 0,
              fontSize: 30,
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
            bottom: 20,
            color: 'white',
            fontSize: 13
          }}>
            {selectedIndex + 1} / {selectedImages.length}
          </div>
        </div>
      )}
    </main>
  )
}

const inputStyle = {
  padding: 13,
  border: '1px solid #e5dfd5',
  borderRadius: 8,
  background: '#fbfaf7',
  color: '#29251f',
  outline: 'none'
}

const buttonStyle = {
  padding: '11px 22px',
  border: 'none',
  borderRadius: 25,
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
  fontSize: 12
}

const galleryArrowStyle = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  borderRadius: '50%',
  color: 'white',
  fontSize: 35,
  width: 45,
  height: 45,
  cursor: 'pointer',
  margin: '0 10px'
}

const removeButtonStyle = {
  position: 'absolute',
  top: 6,
  right: 6,
  width: 27,
  height: 27,
  border: 'none',
  borderRadius: '50%',
  background: 'rgba(0,0,0,0.7)',
  color: 'white',
  fontSize: 20,
  cursor: 'pointer'
}
