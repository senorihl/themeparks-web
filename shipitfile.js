// shipitfile.js
module.exports = shipit => {
    // Load shipit-deploy tasks
    require('shipit-deploy')(shipit);

    const deployDirectory = '/var/www/themeparks';

    shipit.initConfig({
        default: {
            deployTo: deployDirectory,
            repositoryUrl: 'git@github.com:senorihl/themeparks-web.git',
            ignores: ['.git', 'node_modules', 'themeparks.sqlite-journal', 'themeparks.sqlite', '.version'],
            keepReleases: 3,
            branch: process.env.SHIPIT_BRANCH || 'master',
            deleteOnRollback: false,
        },
        staging: {
            servers: 'www-data@ns3057932.ip-91-121-152.eu',
        },
    });


    shipit.task('start', async () => {
        let previous = `${shipit.releasesPath}/${shipit.previousRelease}`;
        let cwd = `${shipit.releasesPath}/${shipit.releaseDirname}`;
        try {
            await shipit.remote(`cp ${previous}/themeparks.sqlite ${cwd}/themeparks.sqlite`);
        } catch (e) {
            shipit.log('No previous database to backup.');
        }

        await shipit.remote(`NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node && yarn install --production=false`, {cwd});

        if (process.env.SEMVER_VERSION) {
            await shipit.remote(`NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node && echo '${process.env.SEMVER_VERSION}' > .version`, {cwd});
        } else {
            let [{stdout: previousVersion}] = await shipit.remote(`cat ${previous}/.version || true`);
            previousVersion = previousVersion.trim() === '' ? '0.0.0' : previousVersion.trim();
            await shipit.remote(`NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node && yarn -s semver -i ${process.env.SEMVER_INCREMENT || 'patch'} ${previousVersion} > .version`, {cwd});
        }

        await shipit.remote(`NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node && yarn webpack && yarn webpack --config=webpack.server.js`, {cwd});
        await shipit.remote(`NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node && npm i -g pm2`, {cwd});
        await shipit.remote(`NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node && pm2 start server.production.js`, {cwd});
        await shipit.remote(`NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use node && pm2 del server.production.js`, {cwd: previous});
    });

    shipit.on('deployed', async () => {
       shipit.start('start');
    });
};
