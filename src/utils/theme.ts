export const colors = {
    /* My other colors */
    stringType: (opacity: number) => `rgba(150,255,150, ${opacity / 1000})`,
    
    numericType: (opacity: number) => `rgba(150,150,255, ${opacity / 1000})`,
    
    /* Alpha black and white */
    blackAlpha: (variant: number) => {
      return `rgba(0,0,0, ${variant / 1000})`
    },
    whiteAlpha: (variant: number) => {
      return `rgba(255,255,255, ${variant / 1000})`
    }

  };
  