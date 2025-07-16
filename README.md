# 🫀 Heart App – Real-Time ECG Simulation & Visualization

This project visualizes real-time ECG signals, simulates heart activity using PQRST waveforms, and integrates with a Unity-based logic for accurate waveform rendering. It also includes a Google Colab notebook for ECG signal processing and dataset analysis.

---

## 📁 Project Structure

![project structure](image-1.png)

---

## ⚙️ Features

- 📈 Real-time **ECG waveform visualization** (forward and reverse)
- 🎯 Physics-based logic inspired by Unity simulation
- 🧠 Web Worker offloads synthetic ECG generation
- 🔄 Live **QRS**, **P**, and **T wave** rendering
- 🔁 Bidirectional communication with heart model
- 📚 Dataset & Google Colab integration for signal analysis

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/Kalmeshteli17/heart_simulation.git
cd heart_simulation
```

2. Install dependencies
```bash
npm install
```

3. Run the app locally

```bash
npm start
```
App will be available at http://localhost:3000


📊 Dataset

 All datasets used for PQRS waveform generation and visualization are located in:

    /datasets/

 MIT-BIH samples, or synthetic signal datasets here.


 📒Notebooks

  You’ll find Google Colab-compatible notebooks under:

    /notebooks/ecg-analysis.ipynb

  This includes:

   1.Signal cleaning & smoothing

   2.Peak detection

   3.PQRS interval annotation

   4.BPM estimation



🛑Git Ignore Highlights

   Your .gitignore prevents the following from being tracked:

   node_modules/
        
   build/
        
   .env*
        
   *.log
        
  Your datasets, notebooks, and source files will be safely committed to GitHub.

📸 Preview

![Preview](image.png)

👨‍💻 Credits

   ECG waveform logic based on Unity's LineRenderer

   Visualization using Chart.js

   Designed & built by Kalmesh Bharamappa Teli and Kiran

🧠 License

  MIT License. Feel free to use and modify.

