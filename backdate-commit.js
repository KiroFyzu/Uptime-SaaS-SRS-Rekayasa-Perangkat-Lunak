const simpleGit = require('simple-git');
const moment = require('moment');
const fs = require('fs');

const git = simpleGit();

const CONFIG = {
    minCommitsPerDay: 4,
    maxCommitsPerDay: 10,
    startMonth: 2,
    startDay: 1,
    endMonth: 4,
    endDay: 6,
    commitHourStart: 9,
    commitHourEnd: 21
};

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function isWeekend(dateMoment) {
    const day = dateMoment.day();
    return day === 0 || day === 6;
}

function randomCommitMoment(baseDate) {
    return baseDate.clone()
        .hour(randomInt(CONFIG.commitHourStart, CONFIG.commitHourEnd))
        .minute(randomInt(0, 59))
        .second(randomInt(0, 59));
}

async function backdateCommit(commitMoment, commitNumber, totalForDay) {
    const date = commitMoment.format('YYYY-MM-DD HH:mm:ss');
    const safeDate = commitMoment.format('YYYY-MM-DD_HH-mm-ss');
    const fileName = `backdate_${safeDate}_${commitNumber}.txt`;
    const content = `Backdated commit for ${date} - #${commitNumber}`;

    fs.writeFileSync(fileName, content);
    await git.add(fileName);

    // Set tanggal khusus untuk commit
    await git.env('GIT_AUTHOR_DATE', date)
             .env('GIT_COMMITTER_DATE', date)
             .commit(`Backdated commit for ${date} - #${commitNumber}/${totalForDay}`);

    fs.unlinkSync(fileName);
    console.log(`✅ Commit #${commitNumber}/${totalForDay} untuk ${date} berhasil`);
}

async function fillFromFebruaryToApril6(year = moment().year()) {
    const startDate = moment(`${year}-${String(CONFIG.startMonth).padStart(2, '0')}-${String(CONFIG.startDay).padStart(2, '0')}`, 'YYYY-MM-DD');
    const endDate = moment(`${year}-${String(CONFIG.endMonth).padStart(2, '0')}-${String(CONFIG.endDay).padStart(2, '0')}`, 'YYYY-MM-DD');

    console.log(`Memulai backdate commit dari ${startDate.format('YYYY-MM-DD')} sampai ${endDate.format('YYYY-MM-DD')}`);

    for (let date = startDate.clone(); date.isSameOrBefore(endDate, 'day'); date.add(1, 'day')) {
        if (isWeekend(date)) {
            console.log(`⏭️  ${date.format('YYYY-MM-DD')} adalah weekend, dilewati`);
            continue;
        }

        const commitCount = randomInt(CONFIG.minCommitsPerDay, CONFIG.maxCommitsPerDay);
        console.log(`\n📅 ${date.format('YYYY-MM-DD')} -> target ${commitCount} commit`);

        for (let i = 1; i <= commitCount; i++) {
            const commitMoment = randomCommitMoment(date);
            await backdateCommit(commitMoment, i, commitCount);
            await new Promise(resolve => setTimeout(resolve, randomInt(200, 1000)));
        }

        console.log('---');
    }

    await git.push();
    console.log('✅ Selesai, semua commit sudah di-push');
}

// Jalankan
fillFromFebruaryToApril6().catch((error) => {
    console.error(`❌ Gagal menjalankan script: ${error.message}`);
    process.exit(1);
});