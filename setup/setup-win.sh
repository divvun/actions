set -ex
curl -sLo LockedList.zip https://nsis.sourceforge.io/mediawiki/images/d/d3/LockedList.zip
unzip LockedList.zip "Plugins/*" -d "C:\Program Files (x86)\NSIS" -q
unzip LockedList.zip "Plugins/x86-ansi/*" -d "C:\Program Files (x86)\NSIS" -q
unzip LockedList.zip "Plugins/x86-unicode/*" -d "C:\Program Files (x86)\NSIS" -q

git clone https://github.com/divvun/divvun-ci-config.git
cd divvun-ci-config
openssl aes-256-cbc -d -in ./config.txz.enc -pass pass:$DIVVUN_KEY -out config.txz -md md5
7z e config.txz
tar xf config.tar