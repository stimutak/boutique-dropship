import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const ProductDebug = () => {
  const { products, isLoading, error } = useSelector(state => state.products)
  const [imageStatus, setImageStatus] = useState({})

  useEffect(() => {
    // Check each image
    products.forEach(product => {
      if (product.images?.[0]?.url) {
        const img = new Image()
        img.onload = () => {
          setImageStatus(prev => ({ ...prev, [product._id]: 'loaded' }))
        }
        img.onerror = () => {
          setImageStatus(prev => ({ ...prev, [product._id]: 'error' }))
        }
        img.src = product.images[0].url
      }
    })
  }, [products])

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 10, 
      right: 10, 
      background: 'white', 
      border: '2px solid black', 
      padding: '10px',
      maxWidth: '300px',
      maxHeight: '400px',
      overflow: 'auto',
      zIndex: 9999
    }}>
      <h3>Product Debug Info</h3>
      <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
      <p>Error: {error || 'None'}</p>
      <p>Total Products: {products.length}</p>
      <h4>Products:</h4>
      {products.map((product, index) => (
        <div key={product._id} style={{ marginBottom: '10px', borderBottom: '1px solid #ccc' }}>
          <p><strong>{index + 1}. {product.name}</strong></p>
          <p>ID: {product._id}</p>
          <p>Has Image: {product.images?.length > 0 ? 'Yes' : 'No'}</p>
          {product.images?.[0] && (
            <>
              <p>Image URL: {product.images[0].url.substring(0, 50)}...</p>
              <p>Image Status: {imageStatus[product._id] || 'checking...'}</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

export default ProductDebug