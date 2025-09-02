import { useState } from 'react';

function App() {
  const [form, setForm] = useState({
    childId: '',
    date: '',
    breakfast: '',
    lunch: '',
    snack: '',
    sleepHours: '',
    hydration: false,
    photos: '',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  const logData = {
    date: form.date,
    meals: {
      breakfast: form.breakfast,
      lunch: form.lunch,
      snack: form.snack
    },
    sleepHours: parseFloat(form.sleepHours),
    hydration: form.hydration,
    photos: form.photos.split(',').map(p => p.trim()),
    notes: form.notes
  };

  console.log("Submitting log:", logData);

  try {
    const response = await fetch(`http://localhost:5000/api/children/${form.childId}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    });

    const result = await response.text();
    console.log("Server response:", result);
    alert(result);
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Error submitting log");
  }
};


  return (
    <div style={{ padding: '2rem' }}>
      <h1>Daily Log Entry</h1>
      <form onSubmit={handleSubmit}>
        <input name="childId" placeholder="Child ID" onChange={handleChange} required /><br />
        <input name="date" type="date" onChange={handleChange} required /><br />
        <input name="breakfast" placeholder="Breakfast" onChange={handleChange} /><br />
        <input name="lunch" placeholder="Lunch" onChange={handleChange} /><br />
        <input name="snack" placeholder="Snack" onChange={handleChange} /><br />
        <input name="sleepHours" placeholder="Sleep (hrs)" onChange={handleChange} /><br />
        <label>
          <input type="checkbox" name="hydration" onChange={handleChange} />
          Hydration OK
        </label><br />
        <input name="photos" placeholder="Photo filenames (comma-separated)" onChange={handleChange} /><br />
        <textarea name="notes" placeholder="Notes" onChange={handleChange}></textarea><br />
        <button type="submit">Submit Log</button>
      </form>
    </div>
  );
}

export default App;
