import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      backgroundColor: '#1e1e1e',
      color: '#d4d4d4',
      fontFamily: 'Consolas, monospace',
      overflow: 'hidden'
    }}>
      {/* Sol Panel */}
      <div style={{
        flex: 1,
        padding: '3rem',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#ffffff' }}>
          Güvenlik Taraması Yönetim Paneli
        </h1>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
          Bu uygulama, Kali Linux üzerindeki Nmap, Dirb, FFUF, WPScan ve MSFConsole gibi araçları kullanıcı dostu bir arayüzle birleştirerek hedef sistemler üzerinde tarama yapmanı sağlar.
        </p>
        <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
          Projelerini yönetebilir, çıktıları inceleyebilir ve toplulukla etkileşim kurabilirsin.
        </p>
        <Link to="/new">
          <button style={{
            marginTop: '2rem',
            padding: '1rem 2rem',
            fontSize: '1rem',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}>
            Hemen Başla
          </button>
        </Link>
      </div>

      {/* Sağ Panel - Topluluk Sayfası */}
      <div style={{
        flex: 1.2,
        borderLeft: '1px solid #333',
        height: '100%',
        overflow: 'hidden'
      }}>
        <iframe
          src="https://www.bilgiveteknoloji.com/forum/public/t/g-venlik-taramas-y-netim-paneli"
          title="Topluluk"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </div>
    </div>
  )
}

export default Home
