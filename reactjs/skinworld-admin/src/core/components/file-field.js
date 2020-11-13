import React from 'react';
import cn from 'classnames';
import { withStyles } from '@material-ui/core/styles';

class IFileField extends React.Component {

  onFileChange = (e) => {
    const { input } = this.props
    const targetFile = e.target.files[0]
    if (targetFile) {
      input.onChange(targetFile)
    } else {
      input.onChange(null)
    }
  }

  render() {
    const { classes, className} = this.props;

    return (
      <input
        className={cn(classes.input, className)}      
        type="file"
        accept="image/*"
        onChange={this.onFileChange}
      />
    )
  }
}

const styles = theme => ({
  input: {
    '& input': {
      padding: 12
    },
  }
})

export default withStyles(styles)(IFileField);
