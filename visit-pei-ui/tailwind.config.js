/** @type {import('tailwindcss').Config} */
const { COLOR } = require('./styles/colors');

module.exports = {
    content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                brandGreen: COLOR.brandGreen,
                brandBlue: COLOR.blue,
                mainText: COLOR.mainText,
                lightGreen: COLOR.lightGreen,
                headingText: COLOR.headingText,
                whiteText: COLOR.whiteText,
            },
        },
    },
    plugins: [],
}
