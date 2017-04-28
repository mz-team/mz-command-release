# mz-command-release

基于 fis3-command-release 修改，增加 -W 参数以支持 weinre 调试，增加 beforeRelease/afterRelease hook 便于任务订制。

## Usage

     Usage: mz release [media name]

     Options:

       -d, --dest <names>     release output destination
       -w, --watch            monitor the changes of project
       -L, --live             automatically reload your browser
       -c, --clean            clean compile cache
       -u, --unique           use unique compile caching
       -W, --weinre <user>    start weinre server and debug
       -m, --message          release message
