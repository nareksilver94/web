import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  typography: {
    useNextVariants: true,
  },
  palette: {
    primary: {
      main: '#c8cace',
    },
    secondary: {
      main: '#9299a7',
    },
    text: {
      primary: '#acb3c3',
      secondary: '#c8cace',
      dark: '#2b2d34'
    },
    error: {
      main: '#ff7065'
    },
    custom: {
      primary: {
        main: '#47cdff',
        normal: '#ffffff',
        dark: '#21eafc',
      },
      secondary: {
        main: '#e6715e',
        dark: '#f7ab39'
      },
      lightGreen: '#27ee9c',
      lightBlue: '#47cdff',
      lightGray: '#e9ecf1'
    },
  },
});

export default theme
