jQuery UI DownloadBuilder & ThemeRoller backend and frontend application.

## Requirements
- node >= 0.8.x.
- ImageMagick 6.6.x. (see apendix below for instructions to compile it from source)
- npm.
- grunt-cli. (installed globally via npm)
- [api.jquery.com](https://github.com/jquery/api.jquery.com) requirements.

## Getting Started

Install node modules.
```
$ npm install
```

Prepare the releases (declared in `config.json`) and build the frontend js bundles.
```
$ grunt prepare
```

Run the server.
```
$ node server.js --console
```

Go to the URL it outputs.

## Development

### config.json

Use the config file to define which jQueryUI version DownloadBuilder should serve. Eg:
```
"jqueryUi": {
  "stable": {  // required
    "version": "1.10.0"
    "dependsOn": "jQuery 1.7+"
  },
  "legacy": {  // optional
    "version": "1.9.1"
    "dependsOn": "jQuery 1.6+"
  }
}
```

The `stable` release is required, but `legacy` is optional. Each release has the following attributes:
- `version` is a String, can be a tag or a branch of jQuery UI. Note: use `repo/branch` eg. `origin/master` when defining a branch.
- `dependsOn` is a String, any textual value allowed.
- `path` [optional] can be used instead of `version` to straight point to the prepared release path.


### node server.js

Use `node server.js` to run the server. Arguments:
- `--console` output to console instead of syslog (via simple-log module);
- `--host <name>` specify custom host. Default localhost;
- `--nocache` skip caching release files and theme images;
- `--port <number>` specify custom port. Default 8088;


### Test

Use `npm test` to run the unit tests.


## Deploy on WP

On [jqueryui.com](https://github.com/jquery/jqueryui.com), run `grunt deploy` [note, run that on jqueryui.com repo]. More details on its README.

### Local testing

Here's how to do integration testing with WordPress:

Symlink your local download.jqueryui.com module on jqueryui.com.
```
$ cd <local download.jqueryui.com path>
$ npm link
$ cd <local jqueryui.com path>
$ npm link download.jqueryui.com
```

Temporarily change its `grunt.js` to use localhost instead of http://download.jqueryui.com.
```diff
                var frontend = require( "download.jqueryui.com" ).frontend({
-                               host: "http://download.jqueryui.com"
+                               host: "http://localhost:8088",
                                env: "production"
                        }),
```

## Appendix

### Compile and install ImageMagick from source

Commands:
```
$ wget http://www.imagemagick.org/download/legacy/ImageMagick-6.6.9-10.tar.gz
$ tar -xzf ImageMagick-6.6.9-10.tar.gz
$ cd ImageMagick-6.6.9-10
$ ./configure CFLAGS=-O5 CXXFLAGS=-O5 --prefix=/opt --enable-static --with-png --disable-shared
```

Make sure you have the below in the output.
```
PNG               --with-png=yes		yes
```

If "png=yes no", libpng is missing and needs to be installed, `apt-get install libpng-dev` on linux or `brew install libpng` on OS X.

Continuing...
```
$ make -j5 && sudo make install
export MAGICK_HOME="/opt"
export PATH="$MAGICK_HOME/bin:$PATH"
export LD_LIBRARY_PATH="$MAGICK_HOME/lib/"
export DYLD_LIBRARY_PATH="$MAGICK_HOME/lib/"
```

Make sure you get the right bin when running it.
```
$ which convert
/opt/bin/convert
```

Hint: add those export statements into your .bash_profile.
