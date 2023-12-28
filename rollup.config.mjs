const config = [];

config.push({
	input: 'src/socket.js',
	output: [
		{
			file: 'dist/socket.cjs.js',
			format: 'cjs',
			//plugins: []
		},
		{
			file: 'dist/socket.esm.js',
			format: 'es',
			//plugins: []
		}
	],
	//plugins: []
})

config.push({
	input: 'src/browser.js',
	output: [
		{//umd
			file: 'dist/socket.umd.js',
			format: 'umd',
			name: 'Socket',
			//plugins: []
		},
		{//browser
			file: 'dist/socket.js',
			format: 'iife',
			name: 'Socket',
			//plugins: []
		}
	],
	plugins: [
		//commonjs(),
		//json()
	]
})

export default config;