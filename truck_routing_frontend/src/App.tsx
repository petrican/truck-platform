import './App.css'
import SidebarForm from './components/SidebarForm'

function App() {


  return (
    <div className="layout-container">
      <aside className="sidebar">
        <SidebarForm onSubmit={(data) => console.log('Form submitted:', data)} />
      </aside>
      <main className="content">
        <h1>Truck Routing App</h1>
        <p>Welcome to the Truck Routing App!</p>
      </main>
    
    </div>
  )
}

export default App
