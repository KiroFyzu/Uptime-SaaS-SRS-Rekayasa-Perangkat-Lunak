const simpleGit = require('simple-git');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

const git = simpleGit();
const COMMITS_FILE = 'commit_history.json';

// Konfigurasi
const CONFIG = {
    minCommitsPerDay: 1,    // Minimal commit per hari
    maxCommitsPerDay: 5,    // Maksimal commit per hari
    workingHours: {
        start: 8,   // Mulai jam 8 pagi
        end: 22     // Sampai jam 10 malam
    }
};

// Baca history commit
function readCommitHistory() {
    try {
        if (fs.existsSync(COMMITS_FILE)) {
            const data = fs.readFileSync(COMMITS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.log('Membuat file history baru...');
    }
    return { commits: [] };
}

// Simpan history commit
function saveCommitHistory(history) {
    fs.writeFileSync(COMMITS_FILE, JSON.stringify(history, null, 2));
}

// Cek apakah sudah commit hari ini
function hasCommittedToday(history, date) {
    return history.commits.some(commit => commit.date === date);
}

// Dapatkan jumlah commit yang sudah dilakukan hari ini
function getTodayCommitsCount(history, date) {
    const todayCommits = history.commits.filter(commit => commit.date === date);
    return todayCommits.length;
}

// Generate random number between min and max
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Buat file dummy untuk di-commit
function createDummyFile(date, commitNumber) {
    const fileName = `commit_${date}_${commitNumber}.txt`;
    const content = `Auto commit on ${date} - Commit #${commitNumber}\nTimestamp: ${new Date().toISOString()}\nRandom: ${Math.random()}`;
    
    fs.writeFileSync(fileName, content);
    return fileName;
}

// Hapus file dummy setelah commit
function cleanupDummyFile(fileName) {
    if (fs.existsSync(fileName)) {
        fs.unlinkSync(fileName);
    }
}

// Buat commit
async function makeCommit(date, commitNumber) {
    const fileName = createDummyFile(date, commitNumber);
    
    try {
        // Set date untuk commit (opsional, biarkan default untuk hari ini)
        // Untuk commit di masa lalu, uncomment baris berikut:
        // await git.env('GIT_AUTHOR_DATE', date).env('GIT_COMMITTER_DATE', date);
        
        await git.add(fileName);
        await git.commit(`Auto commit #${commitNumber} on ${date}`);
        
        cleanupDummyFile(fileName);
        return true;
    } catch (error) {
        console.error(`Gagal commit: ${error.message}`);
        cleanupDummyFile(fileName);
        return false;
    }
}

// Push ke remote
async function pushToRemote() {
    try {
        await git.push();
        console.log('✅ Berhasil push ke remote repository');
        return true;
    } catch (error) {
        console.error(`❌ Gagal push: ${error.message}`);
        return false;
    }
}

// Cek apakah dalam jam kerja
function isWorkingHour() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= CONFIG.workingHours.start && hour < CONFIG.workingHours.end;
}

// Main function
async function autoCommit() {
    console.log(`🚀 Memulai auto commit - ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
    
    // Cek apakah dalam jam kerja
    if (!isWorkingHour() && process.env.FORCE_COMMIT !== 'true') {
        console.log('⏰ Diluar jam kerja, tidak melakukan commit. Gunakan FORCE_COMMIT=true untuk memaksa.');
        return;
    }
    
    const history = readCommitHistory();
    const today = moment().format('YYYY-MM-DD');
    
    // Dapatkan jumlah commit target untuk hari ini
    let targetCommits = randomInt(CONFIG.minCommitsPerDay, CONFIG.maxCommitsPerDay);
    const currentCommits = getTodayCommitsCount(history, today);
    const remainingCommits = targetCommits - currentCommits;
    
    if (remainingCommits <= 0) {
        console.log(`✅ Target commit hari ini sudah tercapai (${currentCommits}/${targetCommits})`);
        return;
    }
    
    console.log(`📊 Target commit hari ini: ${targetCommits}`);
    console.log(`📝 Commit yang sudah dilakukan: ${currentCommits}`);
    console.log(`🔄 Perlu melakukan ${remainingCommits} commit lagi`);
    
    // Lakukan commit yang kurang
    let successCount = 0;
    for (let i = 0; i < remainingCommits; i++) {
        console.log(`\n📌 Melakukan commit #${currentCommits + i + 1} dari ${targetCommits}`);
        
        // Delay random antara 1-30 detik antar commit
        const delay = randomInt(1000, 30000);
        console.log(`⏳ Menunggu ${delay/1000} detik sebelum commit berikutnya...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const success = await makeCommit(today, currentCommits + i + 1);
        if (success) {
            successCount++;
            // Update history
            history.commits.push({
                date: today,
                timestamp: new Date().toISOString(),
                commitNumber: currentCommits + i + 1
            });
            saveCommitHistory(history);
            console.log(`✅ Commit berhasil!`);
        }
    }
    
    console.log(`\n📈 Selesai: ${successCount}/${remainingCommits} commit berhasil`);
    
    // Push semua commit ke remote
    if (successCount > 0) {
        await pushToRemote();
    }
}

// Schedule untuk running setiap interval tertentu
function scheduleCommits(intervalMinutes = 60) {
    console.log(`⏲️  Schedule auto commit setiap ${intervalMinutes} menit`);
    
    // Jalankan pertama kali
    autoCommit();
    
    // Schedule berikutnya
    setInterval(autoCommit, intervalMinutes * 60 * 1000);
}

// Menjalankan script
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--once')) {
        // Jalankan sekali saja
        autoCommit();
    } else if (args.includes('--schedule')) {
        // Jalankan dengan schedule
        const interval = parseInt(args[args.indexOf('--schedule') + 1]) || 60;
        scheduleCommits(interval);
    } else {
        // Default: jalankan sekali
        autoCommit();
    }
}

module.exports = { autoCommit, scheduleCommits };