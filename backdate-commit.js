const simpleGit = require('simple-git');
const moment = require('moment');
const fs = require('fs');

const git = simpleGit();

async function backdateCommit(date, commitCount = 1) {
    console.log(`Membuat ${commitCount} commit untuk tanggal ${date}`);
    
    for (let i = 0; i < commitCount; i++) {
        const fileName = `backdate_${date}_${i}.txt`;
        const content = `Backdated commit for ${date} - #${i}`;
        
        fs.writeFileSync(fileName, content);
        await git.add(fileName);
        
        // Set tanggal khusus untuk commit
        await git.env('GIT_AUTHOR_DATE', date)
                 .env('GIT_COMMITTER_DATE', date)
                 .commit(`Backdated commit for ${date} - #${i}`);
        
        fs.unlinkSync(fileName);
        console.log(`✅ Commit #${i+1} untuk ${date} berhasil`);
        
        // Delay sebentar
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

// Contoh: Buat commit untuk 30 hari terakhir
async function fillLast30Days() {
    for (let i = 1; i <= 30; i++) {
        const date = moment().subtract(i, 'days').format('YYYY-MM-DD HH:mm:ss');
        const commitCount = Math.floor(Math.random() * 3) + 1; // 1-3 commit per hari
        await backdateCommit(date, commitCount);
        console.log(`---`);
    }
    
    await git.push();
    console.log('✅ Selesai!');
}

// Jalankan
fillLast30Days();