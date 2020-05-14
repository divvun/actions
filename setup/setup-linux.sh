set -ex
pwd

git clone --depth=1 https://github.com/divvun/divvun-ci-config.git
cd divvun-ci-config
bash decrypt.sh
cp -R enc/creds $HOME