// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
package example.jllarraz.com.passportreader.mlkit

/** Describing a frame info.  */
class FrameMetadata private constructor(val width: Int, val height: Int, val rotation: Int, val cameraFacing: Int) {

    /** Builder of [FrameMetadata].  */
    class Builder {

        private var width: Int = 0
        private var height: Int = 0
        private var rotation: Int = 0
        private var cameraFacing: Int = 0

        fun setWidth(width: Int): Builder {
            this.width = width
            return this
        }

        fun setHeight(height: Int): Builder {
            this.height = height
            return this
        }

        fun setRotation(rotation: Int): Builder {
            this.rotation = rotation
            return this
        }

        fun setCameraFacing(facing: Int): Builder {
            cameraFacing = facing
            return this
        }

        fun build(): FrameMetadata {
            return FrameMetadata(width, height, rotation, cameraFacing)
        }
    }
}
